// As contas do painel. Tudo sai do relatório de fluxo de caixa, sem chamada nova
// na API. Valores sempre em centavos inteiros.

import type { CashFlowReport } from '@/lib/api/types';
import {
	addDays,
	daysBetween,
	monthEnd,
	monthStart,
	monthsBetween,
	previousMonthStart,
	shiftMonths,
	weekdayOf,
} from '@/lib/dates';
import type { Comparison, Period } from '@/stores/ledger';

export interface DayPoint {
	competence: string;
	entries: number;
	expenses: number;
	net: number;
	/** Dia sem lançamento não volta da API. Aqui ele existe, zerado, para a série ser contínua. */
	hasData: boolean;
}

/** Limite de segurança para período livre muito longo. */
const MAX_DAYS = 400;

export function eachDay(from: string, to: string): string[] {
	const total = Math.min(daysBetween(from, to), MAX_DAYS);
	const days: string[] = [];

	for (let offset = 0; offset < total; offset += 1) days.push(addDays(from, offset));

	return days;
}

/** A API não devolve os buracos. A série temporal preenche com zero. */
export function dailySeries(report: CashFlowReport | undefined, from: string, to: string): DayPoint[] {
	const byDay = new Map((report?.days ?? []).map((day) => [day.competence, day]));

	return eachDay(from, to).map((competence) => {
		const day = byDay.get(competence);

		return {
			competence,
			entries: day?.totalEntriesInCents ?? 0,
			expenses: day?.totalExpensesInCents ?? 0,
			net: day?.netInCents ?? 0,
			hasData: day !== undefined,
		};
	});
}

export function cumulativeNet(points: DayPoint[]): number[] {
	let running = 0;

	return points.map((point) => {
		running += point.net;

		return running;
	});
}

export interface WeekdayAverage {
	/** 0 é domingo, como no Date. */
	weekday: number;
	label: string;
	plural: string;
	/** Média de entradas nos dias em que houve lançamento. */
	average: number;
	days: number;
}

// A semana do restaurante começa na segunda.
const WEEK = [
	{ weekday: 1, label: 'Seg', plural: 'Segundas' },
	{ weekday: 2, label: 'Ter', plural: 'Terças' },
	{ weekday: 3, label: 'Qua', plural: 'Quartas' },
	{ weekday: 4, label: 'Qui', plural: 'Quintas' },
	{ weekday: 5, label: 'Sex', plural: 'Sextas' },
	{ weekday: 6, label: 'Sáb', plural: 'Sábados' },
	{ weekday: 0, label: 'Dom', plural: 'Domingos' },
];

export function weekdayAverages(points: DayPoint[]): WeekdayAverage[] {
	return WEEK.map((slot) => {
		const days = points.filter(
			(point) => point.hasData && weekdayOf(point.competence) === slot.weekday,
		);
		const total = days.reduce((sum, point) => sum + point.entries, 0);

		return { ...slot, average: days.length === 0 ? 0 : Math.round(total / days.length), days: days.length };
	});
}

/** Variação relativa. Sem base de comparação devolve null, e a tela diz isso em vez de inventar um número. */
export function percentChange(current: number, previous: number): number | null {
	if (previous === 0) return null;

	return (current - previous) / Math.abs(previous);
}

/** O fim do período que já aconteceu. Mês corrente vai até hoje, não até o dia 31. */
export function effectiveEnd(from: string, to: string, today: string): string {
	return to > today && from <= today ? today : to;
}

/**
 * O período de comparação. Mês contra mês compara os mesmos dias do mês anterior,
 * para três dias de outubro não disputarem com setembro inteiro. O resto compara
 * com o intervalo de mesmo tamanho imediatamente antes.
 */
export function previousRange(period: Period, from: string, end: string): { from: string; to: string } {
	const length = daysBetween(from, end);

	if (
		period.preset === 'this-month' ||
		period.preset === 'last-month' ||
		period.preset === 'month'
	) {
		const start = previousMonthStart(from);
		const limit = monthEnd(start);

		// Mês fechado contra mês fechado. Setembro inteiro disputa com agosto inteiro.
		if (end === monthEnd(from)) return { from: start, to: limit };

		const candidate = addDays(start, length - 1);

		return { from: start, to: candidate > limit ? limit : candidate };
	}

	const to = addDays(from, -1);

	return { from: addDays(to, -(length - 1)), to };
}

/** O mesmo período, deslocado em meses. Mês inteiro continua mês inteiro no destino. */
function shiftRange(from: string, end: string, months: number): { from: string; to: string } {
	const wholeMonth = from === monthStart(from) && end === monthEnd(from);

	return {
		from: shiftMonths(from, months),
		to: shiftMonths(end, months, wholeMonth),
	};
}

/**
 * O intervalo de comparação que o usuário escolheu.
 *
 * year, o mesmo período doze meses antes. Agosto de 2022 contra agosto de 2021.
 * month, o mesmo período em outro mês. Dias 1 a 15 de setembro contra 1 a 15 de julho.
 * Escolher o próprio mês do período não compararia nada, então cai no período anterior.
 */
export function comparisonRange(
	comparison: Comparison,
	period: Period,
	from: string,
	end: string,
): { from: string; to: string } | null {
	// Comparação limpa. Não há intervalo, e o painel mostra só o período.
	if (comparison.mode === 'none') return null;
	if (comparison.mode === 'custom') return { from: comparison.from, to: comparison.to };
	if (comparison.mode === 'year') return shiftRange(from, end, -12);

	if (comparison.mode === 'month') {
		const months = monthsBetween(from, comparison.month);

		if (months !== 0) return shiftRange(from, end, months);
	}

	return previousRange(period, from, end);
}

export interface PeriodStats {
	openDays: number;
	averageEntries: number;
	/** Quanto do que entrou sobrou. Null quando não entrou nada. */
	margin: number | null;
	best: DayPoint | null;
	worst: DayPoint | null;
}

export function periodStats(points: DayPoint[]): PeriodStats {
	const open = points.filter((point) => point.hasData);
	const entries = open.reduce((sum, point) => sum + point.entries, 0);
	const net = open.reduce((sum, point) => sum + point.net, 0);

	let best: DayPoint | null = null;
	let worst: DayPoint | null = null;

	for (const point of open) {
		if (best === null || point.net > best.net) best = point;
		if (worst === null || point.net < worst.net) worst = point;
	}

	return {
		openDays: open.length,
		averageEntries: open.length === 0 ? 0 : Math.round(entries / open.length),
		margin: entries === 0 ? null : net / entries,
		best,
		// Com um dia só, melhor e pior seriam o mesmo dia.
		worst: open.length > 1 ? worst : null,
	};
}

/** Passo redondo para a escala, em centavos. 1, 2, 2,5 ou 5 vezes uma potência de dez. */
export function niceStep(max: number, targetTicks = 3): number {
	if (max <= 0) return 100;

	const raw = max / targetTicks;
	const magnitude = 10 ** Math.floor(Math.log10(raw));

	for (const multiple of [1, 2, 2.5, 5, 10]) {
		if (multiple * magnitude >= raw) return multiple * magnitude;
	}

	return 10 * magnitude;
}
