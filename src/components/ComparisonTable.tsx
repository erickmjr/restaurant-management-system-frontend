import type { ReactNode } from 'react';
import { percentChange } from '@/lib/analytics';
import { formatSigned } from '@/lib/money';
import styles from './ComparisonTable.module.css';
import { Delta } from './Delta';
import { Money, type MoneyTone } from './Money';

/** Um dos dois lados da comparação. */
export interface ComparisonSide {
	/** Nome do período, como "Agosto de 2022". */
	label: string;
	entries: number;
	expenses: number;
	net: number;
	averageEntries: number;
	openDays: number;
	/** Quanto do que entrou sobrou. Null quando não entrou nada. */
	margin: number | null;
	/** Falso quando o período não tem nenhum lançamento. */
	hasData: boolean;
}

interface ComparisonTableProps {
	current: ComparisonSide;
	previous: ComparisonSide;
	/** Com filtro de tag. Saídas não têm tag, então só as linhas de entrada fazem sentido. */
	entriesOnly?: boolean;
	/** Falso enquanto o detalhe por dia não está disponível nos dois períodos. */
	withDaily?: boolean;
}

interface Row {
	/** Linha sem variação em porcentagem. A diferença já diz tudo. */
	plainDifference?: boolean;
	label: string;
	a: ReactNode;
	b: ReactNode;
	difference: string;
	change: number | null;
	goodWhenUp: boolean;
}

const plural = (amount: number, one: string, many: string) =>
	`${amount > 0 ? '+' : amount < 0 ? '−' : ''}${String(Math.abs(amount))} ${Math.abs(amount) === 1 ? one : many}`;

/**
 * Os dois períodos lado a lado, linha por linha, com a diferença em reais e
 * em porcentagem. É o que responde "agosto deste ano foi melhor que o do ano passado?".
 */
export function ComparisonTable({
	current,
	previous,
	entriesOnly = false,
	withDaily = true,
}: ComparisonTableProps) {
	const money = (label: string, a: number, b: number, tone: MoneyTone, goodWhenUp: boolean): Row => ({
		label,
		a: <Money cents={a} tone={tone} />,
		b: <Money cents={b} tone={tone} />,
		difference: formatSigned(a - b),
		change: percentChange(a, b),
		goodWhenUp,
	});

	const marginPoints =
		current.margin === null || previous.margin === null
			? null
			: Math.round(current.margin * 100) - Math.round(previous.margin * 100);

	const all: Row[] = [
		money('Entrou', current.entries, previous.entries, 'entry', true),
		// Gastar mais é piora, então aqui subir é ruim.
		money('Saiu', current.expenses, previous.expenses, 'expense', false),
		money('Sobrou', current.net, previous.net, 'net', true),
		money('Entrou por dia', current.averageEntries, previous.averageEntries, 'plain', true),
		{
			label: entriesOnly ? 'Dias com entrada' : 'Dias com lançamento',
			a: <span className={styles.plain}>{current.openDays}</span>,
			b: <span className={styles.plain}>{previous.openDays}</span>,
			difference: plural(current.openDays - previous.openDays, 'dia', 'dias'),
			change: null,
			goodWhenUp: true,
			plainDifference: true,
		},
		{
			label: 'Margem',
			a: (
				<span className={styles.plain}>
					{current.margin === null ? 'Sem entrada' : `${String(Math.round(current.margin * 100))}%`}
				</span>
			),
			b: (
				<span className={styles.plain}>
					{previous.margin === null ? 'Sem entrada' : `${String(Math.round(previous.margin * 100))}%`}
				</span>
			),
			// Margem já é porcentagem, então a diferença é em pontos.
			difference: marginPoints === null ? 'Sem base' : plural(marginPoints, 'ponto', 'pontos'),
			change: null,
			goodWhenUp: true,
			plainDifference: true,
		},
	];

	const DAILY = ['Entrou por dia', 'Dias com entrada', 'Dias com lançamento'];
	const EXPENSE_SIDE = ['Saiu', 'Sobrou', 'Margem'];

	const rows = all.filter(
		(row) =>
			(withDaily || !DAILY.includes(row.label)) && (!entriesOnly || !EXPENSE_SIDE.includes(row.label)),
	);

	return (
		<div className={styles.table}>
			{/* Cabeçalho das colunas. Só aparece com largura. No celular, cada linha traz os nomes. */}
			<div className={styles.columns} aria-hidden="true">
				<span />
				<span>{current.label}</span>
				<span>{previous.label}</span>
				<span>Diferença</span>
				<span>Variação</span>
			</div>

			{rows.map((row) => (
				<div key={row.label} className={styles.row}>
					<span className={styles.metric}>{row.label}</span>

					<span className={styles.a}>
						<span className={styles.side}>{current.label}</span>
						{row.a}
					</span>

					<span className={styles.b}>
						<span className={styles.side}>{previous.label}</span>
						{previous.hasData ? row.b : <span className={styles.missing}>Sem lançamento</span>}
					</span>

					<span className={styles.difference}>
						<span className={styles.side}>Diferença</span>
						<span className={styles.signed}>{previous.hasData ? row.difference : 'Sem base'}</span>
					</span>

					<span className={styles.change}>
						{row.plainDifference === true ? (
							<span className={styles.missing} aria-hidden="true" />
						) : (
							<Delta
								change={previous.hasData ? row.change : null}
								goodWhenUp={row.goodWhenUp}
								empty="Sem base"
							/>
						)}
					</span>
				</div>
			))}
		</div>
	);
}
