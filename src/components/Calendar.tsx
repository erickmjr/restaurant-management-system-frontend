'use client';

import { useQueries } from '@tanstack/react-query';
import Link from 'next/link';
import { useNow } from '@/hooks/useNow';
import { messageOf } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import { keys, useBalance, useReport } from '@/lib/api/queries';
import type { ReportDay } from '@/lib/api/types';
import { cx } from '@/lib/cx';
import {
	addDays,
	addMonths,
	capitalize,
	dayHref,
	describeTimeLeft,
	formatInstantDate,
	formatLongDate,
	formatMonthTitle,
	monthEnd,
	monthMatrix,
	monthStart,
	todayCompetence,
	WEEK_HEADER,
} from '@/lib/dates';
import { formatCents, formatTiny } from '@/lib/money';
import { useLedger } from '@/stores/ledger';
import { Button, buttonClass } from './Button';
import styles from './Calendar.module.css';
import { ChevronLeft, ChevronRight, LockIcon, Trend } from './icons';
import { LaunchActions } from './LaunchActions';
import { Money } from './Money';
import { Sheet } from './Sheet';

/**
 * O calendário do mês. Cada dia é um bloco com o que entrou e o que saiu,
 * e o saldo aparece na lateral do bloco e na seta, para cima ou para baixo.
 * Tocar num dia mostra o que ele tem.
 */
export function Calendar() {
	const now = useNow();
	const today = todayCompetence(now);
	const storedMonth = useLedger((state) => state.calendarMonth);
	const storedDay = useLedger((state) => state.calendarDay);
	const setCalendar = useLedger((state) => state.setCalendar);

	const month = storedMonth ?? monthStart(today);
	// Sem escolha, o mês corrente abre com hoje selecionado.
	const selected = storedDay ?? (month === monthStart(today) ? today : null);

	const query = useReport(month, monthEnd(month));
	// Ao trocar de mês, o relatório anterior fica na tela por um instante. Ele não serve para este mês.
	const report = query.data?.from === month ? query.data : undefined;
	const byDay = new Map((report?.days ?? []).map((day) => [day.competence, day]));
	const openDays = useOpenWindows(today, now);
	const canGoForward = addMonths(month, 1) <= today;

	const go = (nextMonth: string, day: string | null) => setCalendar(nextMonth, day);

	return (
		<Sheet>
			<header className={styles.header}>
				<div>
					<p className="label">Calendário</p>
					<h1 className={styles.title} aria-live="polite">
						{formatMonthTitle(month)}
					</h1>
				</div>

				<div className={styles.controls}>
					<button
						type="button"
						className={styles.turn}
						onClick={() => go(addMonths(month, -1), null)}
						aria-label="Mês anterior"
					>
						<ChevronLeft />
					</button>
					<Button
						variant="outline"
						size="small"
						className={styles.todayButton}
						onClick={() => go(monthStart(today), today)}
					>
						Hoje
					</Button>
					<button
						type="button"
						className={styles.turn}
						onClick={() => go(addMonths(month, 1), null)}
						disabled={!canGoForward}
						aria-label="Próximo mês"
					>
						<ChevronRight />
					</button>
				</div>
			</header>

			{/* O mês em três números. */}
			<dl className={styles.summary} data-stale={report === undefined}>
				<div className={styles.figure}>
					<dt className="label">Entrou</dt>
					<dd>
						<Money cents={report?.totalEntriesInCents ?? 0} tone="entry" />
					</dd>
				</div>
				<div className={styles.figure}>
					<dt className="label">Saiu</dt>
					<dd>
						<Money cents={report?.totalExpensesInCents ?? 0} tone="expense" />
					</dd>
				</div>
				<div className={styles.figure}>
					<dt className="label">Sobrou</dt>
					<dd>
						<Money cents={report?.netInCents ?? 0} tone="net" />
					</dd>
				</div>
			</dl>

			{query.isError && (
				<div className={styles.failure} role="alert">
					<p className="error">Não foi possível abrir o calendário. {messageOf(query.error)}</p>
					<Button variant="outline" size="small" onClick={() => void query.refetch()}>
						Tentar novamente
					</Button>
				</div>
			)}

			<div className={styles.frame}>
				<div className={styles.layout} data-detail={selected !== null}>
					<div className={styles.board}>
						<div className={styles.grid}>
							{WEEK_HEADER.map((day) => (
								<span key={day.long} className={styles.weekday} aria-hidden="true">
									<span className={styles.short}>{day.short}</span>
									<span className={styles.medium}>{day.medium}</span>
								</span>
							))}

							{monthMatrix(month)
								.flat()
								.map((day, index) =>
									day === null ? (
										<span key={`blank-${String(index)}`} className={styles.blank} />
									) : (
										<DayCell
											key={day}
											competence={day}
											today={today}
											info={byDay.get(day)}
											selected={day === selected}
											windowOpen={openDays.has(day)}
											onSelect={() => go(month, day)}
										/>
									),
								)}
						</div>

						<ul className={styles.legend}>
							<li>
								<Trend className={styles.up} up /> Saldo positivo
							</li>
							<li>
								<Trend className={styles.down} up={false} /> Saldo negativo
							</li>
							<li>
								<span className={styles.windowKey} /> Janela aberta, ainda aceita lançamento
							</li>
						</ul>
					</div>

					{selected !== null && <DayDetail competence={selected} today={today} now={now} />}
				</div>
			</div>
		</Sheet>
	);
}

/**
 * Quais dias ainda aceitam lançamento. O relatório do mês não diz quando a
 * página de cada dia fecha, então isto olha os quatro dias mais recentes,
 * que são os que costumam estar com a janela aberta.
 */
function useOpenWindows(today: string, now: number): Set<string> {
	const recent = [0, 1, 2, 3].map((back) => addDays(today, -back));
	const results = useQueries({
		queries: recent.map((competence) => ({
			queryKey: keys.balance(competence),
			queryFn: () => api.balance(competence),
		})),
	});

	const open = new Set<string>();

	results.forEach((result, index) => {
		const balance = result.data;
		const competence = recent[index];

		if (balance != null && competence !== undefined && !balance.isLocked && Date.parse(balance.lockedAt) > now) {
			open.add(competence);
		}
	});

	return open;
}

interface DayCellProps {
	competence: string;
	today: string;
	info: ReportDay | undefined;
	selected: boolean;
	windowOpen: boolean;
	onSelect: () => void;
}

function DayCell({ competence, today, info, selected, windowOpen, onSelect }: DayCellProps) {
	const future = competence > today;
	const title = capitalize(formatLongDate(competence, today));
	const state = info === undefined ? 'empty' : info.netInCents < 0 ? 'negative' : 'positive';

	return (
		<button
			type="button"
			className={styles.cell}
			data-state={state}
			data-selected={selected}
			data-today={competence === today}
			data-future={future}
			data-window={windowOpen}
			onClick={onSelect}
			aria-pressed={selected}
			aria-label={
				info === undefined
					? `${title}. ${future ? 'Data futura' : 'Sem lançamentos'}.`
					: `${title}. Entrou ${formatCents(info.totalEntriesInCents)}, saiu ${formatCents(info.totalExpensesInCents)}, saldo ${formatCents(info.netInCents)}.`
			}
		>
			<span className={styles.cellTop}>
				<span className={styles.number}>{Number(competence.slice(8, 10))}</span>
				{info !== undefined && (
					<Trend className={info.netInCents < 0 ? styles.down : styles.up} up={info.netInCents >= 0} />
				)}
			</span>

			{info !== undefined && (
				<>
					{/* Bloco estreito, no celular. Em cima o que entrou, embaixo o que saiu. */}
					<span className={styles.tiny}>
						<span className={styles.in}>{formatTiny(info.totalEntriesInCents)}</span>
						<span className={info.totalExpensesInCents === 0 ? styles.zero : styles.out}>
							{formatTiny(info.totalExpensesInCents)}
						</span>
					</span>

					{/* Bloco largo. Os valores inteiros, e o saldo fechando a conta. */}
					<span className={styles.full}>
						<Money cents={info.totalEntriesInCents} tone="entry" />
						<Money cents={info.totalExpensesInCents} tone="expense" />
						<Money className={styles.cellNet} cents={info.netInCents} tone="net" />
					</span>
				</>
			)}
		</button>
	);
}

/** O que o dia escolhido tem. Totais, lançamentos, e o caminho para a página dele. */
function DayDetail({ competence, today, now }: { competence: string; today: string; now: number }) {
	const query = useBalance(competence);
	const balance = query.data ?? null;
	const future = competence > today;
	const timeLeft = balance === null ? null : describeTimeLeft(balance.lockedAt, now);
	const locked = balance !== null && (balance.isLocked || timeLeft === null);
	const canPost = query.isSuccess && !locked && !future;

	return (
		<aside className={styles.detail} aria-label="Dia escolhido">
			<h2 className={styles.detailDate}>{capitalize(formatLongDate(competence, today))}</h2>

			{query.isPending && <p className={styles.quiet}>Carregando</p>}

			{query.isError && (
				<p className="error" role="alert">
					{messageOf(query.error)}
				</p>
			)}

			{query.isSuccess && balance === null && (
				<p className={styles.quiet}>{future ? 'Data futura, ainda sem lançamentos' : 'Nenhum lançamento neste dia'}</p>
			)}

			{balance !== null && (
				<>
					{locked ? (
						<p className={styles.lockedNote}>
							<LockIcon /> Fechado em {formatInstantDate(balance.lockedAt)}
						</p>
					) : (
						<p className={styles.windowNote}>Esta página fecha em {timeLeft}</p>
					)}

					<div className={styles.detailTotals}>
						<div className={styles.detailRow}>
							<span>Entrou</span>
							<Money cents={balance.totalEntriesInCents} tone="entry" />
						</div>
						<div className={styles.detailRow}>
							<span>Saiu</span>
							<Money cents={balance.totalExpensesInCents} tone="expense" />
						</div>
						<div className={cx(styles.detailRow, styles.detailNet)}>
							<span>Saldo</span>
							<Money cents={balance.netInCents} tone="net" />
						</div>
					</div>

					<DetailList
						title="Entradas"
						lines={balance.entries.map((entry) => ({
							id: entry.id,
							name: entry.paymentMethodName,
							observation: entry.observation,
							amountInCents: entry.amountInCents,
						}))}
						tone="entry"
					/>
					<DetailList
						title="Saídas"
						lines={balance.expenses.map((expense) => ({
							id: expense.id,
							name: expense.expenseCategoryName,
							observation: expense.observation,
							amountInCents: expense.amountInCents,
						}))}
						tone="expense"
					/>
				</>
			)}

			<div className={styles.detailActions}>
				{canPost && <LaunchActions competence={competence} />}
				{!future && (
					<Link className={buttonClass('outline')} href={dayHref(competence, today)}>
						Abrir a página do dia
					</Link>
				)}
			</div>
		</aside>
	);
}

interface DetailLine {
	id: string;
	name: string;
	observation: string | null;
	amountInCents: number;
}

function DetailList({
	title,
	lines,
	tone,
}: {
	title: string;
	lines: DetailLine[];
	tone: 'entry' | 'expense';
}) {
	if (lines.length === 0) return null;

	return (
		<section className={styles.detailSection}>
			<h3 className={styles.detailHeading}>{title}</h3>
			<ul>
				{lines.map((line) => (
					<li key={line.id} className={styles.detailRow}>
						<span className={styles.detailText}>
							<span>{line.name}</span>
							{line.observation !== null && <span className={styles.detailNote}>{line.observation}</span>}
						</span>
						<Money cents={line.amountInCents} tone={tone} />
					</li>
				))}
			</ul>
		</section>
	);
}
