'use client';

import { type FormEvent, useId, useState } from 'react';
import type { CatalogItem } from '@/lib/api/types';
import { formatPeriodTitle, isValidCompetence, monthStart } from '@/lib/dates';
import { type Comparison, type Period, useLedger } from '@/stores/ledger';
import { Button } from './Button';
import { Chip } from './Chip';
import { inputClass } from './Field';
import { Cross } from './icons';
import { MonthPicker } from './MonthPicker';
import styles from './PeriodBar.module.css';

const PRESETS: Array<{ period: Exclude<Period, { preset: 'custom' | 'month' }>; label: string }> = [
	{ period: { preset: 'last-7' }, label: '7 dias' },
	{ period: { preset: 'last-30' }, label: '30 dias' },
	{ period: { preset: 'this-month' }, label: 'Este mês' },
	{ period: { preset: 'last-month' }, label: 'Mês passado' },
];

type Panel = 'month' | 'dates' | 'compare-month' | 'compare-dates' | null;

interface PeriodBarProps {
	today: string;
	/** O período que está valendo. */
	from: string;
	to: string;
	/** O intervalo de comparação que está valendo. Null quando a comparação foi limpa. */
	compared: { from: string; to: string } | null;
	/** As tags de pagamento do restaurante. Sem nenhuma, a fileira de tags não aparece. */
	tags: CatalogItem[];
	/** Tags que estão valendo como filtro. */
	activeTagIds: string[];
	/** Nomes dos métodos de pagamento que as tags marcadas alcançam. */
	taggedMethods: string[];
}

const listNames = new Intl.ListFormat('pt-BR', { style: 'long', type: 'conjunction' });

/**
 * Os filtros do painel, numa barra só, acima de tudo o que eles comandam.
 * A primeira fileira escolhe o período. A segunda escolhe com o que comparar,
 * e é ela que permite pôr agosto de um ano ao lado de agosto de outro.
 */
export function PeriodBar({
	today,
	from,
	to,
	compared,
	tags,
	activeTagIds,
	taggedMethods,
}: PeriodBarProps) {
	const period = useLedger((state) => state.period);
	const setPeriod = useLedger((state) => state.setPeriod);
	const comparison = useLedger((state) => state.comparison);
	const setComparison = useLedger((state) => state.setComparison);
	const setTagIds = useLedger((state) => state.setTagIds);
	const [panel, setPanel] = useState<Panel>(null);
	const periodLabel = useId();
	const compareLabel = useId();
	const tagsLabel = useId();

	const toggleTag = (tagId: string) =>
		setTagIds(
			activeTagIds.includes(tagId)
				? activeTagIds.filter((current) => current !== tagId)
				: [...activeTagIds, tagId],
		);

	const toggle = (next: Exclude<Panel, null>) =>
		setPanel((current) => (current === next ? null : next));

	function choosePeriod(next: Period) {
		setPeriod(next);
		setPanel(null);
	}

	function chooseComparison(next: Comparison) {
		setComparison(next);
		setPanel(null);
	}

	// Comparar um mês com ele mesmo não compara nada. Nesse caso vale o período anterior.
	const sameMonth = comparison.mode === 'month' && comparison.month === monthStart(from);
	const mode = sameMonth ? 'previous' : comparison.mode;

	return (
		<div className={styles.bar}>
			<div className={styles.group}>
				<span id={periodLabel} className="label">
					Período
				</span>
				<div role="radiogroup" aria-labelledby={periodLabel} className={styles.chips}>
					{PRESETS.map((preset) => (
						<Chip
							key={preset.period.preset}
							className={styles.chip}
							selected={period.preset === preset.period.preset}
							onClick={() => choosePeriod(preset.period)}
						>
							{preset.label}
						</Chip>
					))}
					<Chip
						className={styles.chip}
						selected={period.preset === 'month'}
						aria-expanded={panel === 'month'}
						onClick={() => toggle('month')}
					>
						Escolher mês
					</Chip>
					<Chip
						className={styles.chip}
						selected={period.preset === 'custom'}
						aria-expanded={panel === 'dates'}
						aria-label="Outras datas para o período"
						onClick={() => toggle('dates')}
					>
						Outras datas
					</Chip>
				</div>

				{panel === 'month' && (
					<MonthPicker
						label="Escolher o mês do período"
						value={period.preset === 'month' ? period.month : null}
						today={today}
						onPick={(month) => choosePeriod({ preset: 'month', month })}
					/>
				)}

				{panel === 'dates' && (
					<RangeForm
						from={from}
						to={to}
						submitLabel="Ver período"
						onApply={(range) => choosePeriod({ preset: 'custom', ...range })}
					/>
				)}
			</div>

			<div className={styles.group}>
				<span id={compareLabel} className="label">
					Comparar com
				</span>
				<div role="radiogroup" aria-labelledby={compareLabel} className={styles.chips}>
					<Chip
						className={styles.chip}
						selected={mode === 'previous'}
						onClick={() => chooseComparison({ mode: 'previous' })}
					>
						Período anterior
					</Chip>
					<Chip
						className={styles.chip}
						selected={mode === 'year'}
						onClick={() => chooseComparison({ mode: 'year' })}
					>
						Ano anterior
					</Chip>
					<Chip
						className={styles.chip}
						selected={mode === 'month'}
						aria-expanded={panel === 'compare-month'}
						onClick={() => toggle('compare-month')}
					>
						Outro mês
					</Chip>
					<Chip
						className={styles.chip}
						selected={mode === 'custom'}
						aria-expanded={panel === 'compare-dates'}
						aria-label="Outras datas para a comparação"
						onClick={() => toggle('compare-dates')}
					>
						Outras datas
					</Chip>
				</div>

				{panel === 'compare-month' && (
					<div className={styles.panel}>
						<p className={styles.hint}>
							O mesmo intervalo de dias, no mês que você escolher.
						</p>
						<MonthPicker
							label="Escolher o mês da comparação"
							value={comparison.mode === 'month' ? comparison.month : null}
							today={today}
							blocked={monthStart(from)}
							onPick={(month) => chooseComparison({ mode: 'month', month })}
						/>
					</div>
				)}

				{panel === 'compare-dates' && (
					<RangeForm
						from={compared?.from ?? from}
						to={compared?.to ?? to}
						submitLabel="Comparar"
						onApply={(range) => chooseComparison({ mode: 'custom', ...range })}
					/>
				)}

				{compared === null ? (
					<p className={styles.off}>Sem comparação. O painel mostra só o período.</p>
				) : (
					<div className={styles.comparing}>
						<p className={styles.against}>
							Comparando com {formatPeriodTitle(compared.from, compared.to)}
							<span className={styles.iso}>
								{compared.from} a {compared.to}
							</span>
						</p>
						{/* Limpar desliga a comparação por inteiro. Para voltar, basta escolher uma das opções acima. */}
						<button
							type="button"
							className={styles.clear}
							onClick={() => chooseComparison({ mode: 'none' })}
						>
							<Cross />
							Limpar comparação
						</button>
					</div>
				)}
			</div>

			{/* Tag pertence a método de pagamento. Marcar uma tag deixa no painel só as entradas desses métodos. */}
			{tags.length > 0 && (
				<div className={styles.group}>
					<span id={tagsLabel} className="label">
						Tags
					</span>
					<div role="group" aria-labelledby={tagsLabel} className={styles.chips}>
						{tags.map((tag) => (
							<Chip
								key={tag.id}
								kind="checkbox"
								className={styles.chip}
								selected={activeTagIds.includes(tag.id)}
								onClick={() => toggleTag(tag.id)}
							>
								{tag.name}
							</Chip>
						))}
					</div>

					{activeTagIds.length > 0 && (
						<div className={styles.comparing}>
							<p className={styles.against}>
								{taggedMethods.length === 0
									? 'Nenhum método de pagamento tem essas tags.'
									: `Só as entradas de ${listNames.format(taggedMethods)}. Saídas não têm tag e ficam de fora.`}
							</p>
							<button type="button" className={styles.clear} onClick={() => setTagIds([])}>
								<Cross />
								Limpar tags
							</button>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

interface RangeFormProps {
	from: string;
	to: string;
	submitLabel: string;
	onApply: (range: { from: string; to: string }) => void;
}

/** Duas datas livres. O erro mora debaixo dos campos. */
function RangeForm({ from, to, submitLabel, onApply }: RangeFormProps) {
	const [draftFrom, setDraftFrom] = useState(from);
	const [draftTo, setDraftTo] = useState(to);
	const fromId = useId();
	const toId = useId();
	const backwards = draftFrom > draftTo;

	function submit(event: FormEvent) {
		event.preventDefault();

		if (backwards || !isValidCompetence(draftFrom) || !isValidCompetence(draftTo)) return;

		onApply({ from: draftFrom, to: draftTo });
	}

	return (
		<form className={styles.range} onSubmit={submit}>
			<div className={styles.fields}>
				<div className={styles.field}>
					<label className="label" htmlFor={fromId}>
						De
					</label>
					<input
						id={fromId}
						type="date"
						className={`${inputClass} ${styles.date}`}
						value={draftFrom}
						onChange={(event) => setDraftFrom(event.target.value)}
						required
					/>
				</div>
				<div className={styles.field}>
					<label className="label" htmlFor={toId}>
						Até
					</label>
					<input
						id={toId}
						type="date"
						className={`${inputClass} ${styles.date}`}
						value={draftTo}
						onChange={(event) => setDraftTo(event.target.value)}
						required
					/>
				</div>
			</div>
			{backwards && (
				<p className="error" role="alert">
					A data inicial não pode ser depois da final.
				</p>
			)}
			<Button type="submit" variant="outline" disabled={backwards}>
				{submitLabel}
			</Button>
		</form>
	);
}
