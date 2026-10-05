'use client';

import { create } from 'zustand';
import { addDays, monthEnd, monthStart, previousMonthStart } from '@/lib/dates';

export type Period =
	| { preset: 'last-7' }
	| { preset: 'last-30' }
	| { preset: 'this-month' }
	| { preset: 'last-month' }
	/** Um mês qualquer, como primeiro dia do mês. */
	| { preset: 'month'; month: string }
	| { preset: 'custom'; from: string; to: string };

/**
 * Com o que o período é comparado.
 * previous, o período de mesmo tamanho imediatamente antes.
 * year, o mesmo período um ano antes. Agosto de 2022 contra agosto de 2021.
 * month, o mesmo período em outro mês. Dias 1 a 15 de setembro contra 1 a 15 de julho.
 * custom, datas livres.
 * none, sem comparação. O painel mostra só o período.
 */
export type Comparison =
	| { mode: 'none' }
	| { mode: 'previous' }
	| { mode: 'year' }
	| { mode: 'month'; month: string }
	| { mode: 'custom'; from: string; to: string };

/** Os atalhos são resolvidos na hora de usar, para não ficarem presos no mês em que a aba abriu. */
export function resolvePeriod(period: Period, today: string): { from: string; to: string } {
	if (period.preset === 'custom') return { from: period.from, to: period.to };
	if (period.preset === 'month') return { from: period.month, to: monthEnd(period.month) };
	if (period.preset === 'last-7') return { from: addDays(today, -6), to: today };
	if (period.preset === 'last-30') return { from: addDays(today, -29), to: today };

	const anchor = period.preset === 'this-month' ? today : previousMonthStart(today);

	return { from: monthStart(anchor), to: monthEnd(anchor) };
}

interface LedgerState {
	/** Período do painel. Fica aqui para sobreviver à ida e volta de um dia. */
	period: Period;
	setPeriod: (period: Period) => void;
	comparison: Comparison;
	setComparison: (comparison: Comparison) => void;
	/** Tags de pagamento marcadas no painel. Vazio é sem filtro. */
	tagIds: string[];
	setTagIds: (tagIds: string[]) => void;
	/** Mês aberto no calendário, como primeiro dia do mês. Null é o mês corrente. */
	calendarMonth: string | null;
	/** Dia escolhido no calendário. */
	calendarDay: string | null;
	setCalendar: (month: string, day: string | null) => void;
	/** Linha recém-lançada, para ela assentar na lista quando a página do dia abrir. */
	settledLineId: string | null;
	markSettled: (lineId: string) => void;
	clearSettled: () => void;
}

export const useLedger = create<LedgerState>()((set) => ({
	period: { preset: 'this-month' },
	setPeriod: (period) => set({ period }),
	comparison: { mode: 'previous' },
	setComparison: (comparison) => set({ comparison }),
	tagIds: [],
	setTagIds: (tagIds) => set({ tagIds }),
	calendarMonth: null,
	calendarDay: null,
	setCalendar: (month, day) => set({ calendarMonth: month, calendarDay: day }),
	settledLineId: null,
	markSettled: (lineId) => set({ settledLineId: lineId }),
	clearSettled: () => set({ settledLineId: null }),
}));
