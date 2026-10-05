'use client';

import { useQueries } from '@tanstack/react-query';
import { api } from './endpoints';
import { keys } from './queries';
import type { CashFlowReport, ReportDay } from './types';

/**
 * Até quantos dias com lançamento o filtro de tag detalha dia a dia.
 * O detalhe custa um pedido por dia, então período longo fica só com os totais.
 */
export const TAG_DAILY_LIMIT = 93;

/**
 * off, sem filtro de tag, o relatório passa direto.
 * ready, as séries por dia estão prontas.
 * loading, os dias ainda estão sendo buscados.
 * unavailable, período longo demais para detalhar por dia. Os totais continuam filtrados.
 */
export type DailyState = 'off' | 'ready' | 'loading' | 'unavailable';

export interface TaggedReport {
	report: CashFlowReport | undefined;
	daily: DailyState;
	/** Quantos dias já chegaram, e de quantos, para mostrar o andamento. */
	loaded: number;
	total: number;
}

/**
 * O relatório filtrado pelos métodos de pagamento que têm as tags marcadas.
 *
 * Tag pertence a método de pagamento, então o filtro vale para entradas.
 * Saídas não têm tag, e por isso saem do relatório filtrado, zeradas.
 *
 * A API não filtra por tag nem quebra o dia por método. Os totais saem de
 * byPaymentMethod, que já vem por método. O detalhe por dia sai da página
 * de cada dia, a mesma consulta que a página do dia usa, então o que já foi
 * visto vem do cache.
 */
export function useTaggedReport(
	report: CashFlowReport | undefined,
	methodIds: ReadonlySet<string> | null,
): TaggedReport {
	const filtering = methodIds !== null && report !== undefined;
	const tooLong = filtering && report.days.length > TAG_DAILY_LIMIT;
	const days = filtering && !tooLong ? report.days : [];

	const fetched = useQueries({
		queries: days.map((day) => ({
			queryKey: keys.balance(day.competence),
			queryFn: () => api.balance(day.competence),
			// São muitos dias de uma vez. Não vale refazer tudo a cada troca de aba.
			staleTime: 60_000,
			refetchOnWindowFocus: false,
		})),
		combine: (results) => ({
			// Dia que deu erro conta como chegado, senão o painel ficaria carregando para sempre.
			settled: results.filter((result) => !result.isPending).length,
			balances: results.map((result) => result.data ?? null),
		}),
	});

	if (!filtering) return { report, daily: 'off', loaded: 0, total: 0 };

	const byPaymentMethod = report.byPaymentMethod.filter((method) => methodIds.has(method.id));
	const totalEntriesInCents = byPaymentMethod.reduce((sum, method) => sum + method.totalInCents, 0);

	let daily: DailyState = 'ready';
	let dayRows: ReportDay[] = [];

	if (tooLong) {
		daily = 'unavailable';
	} else if (fetched.settled < days.length) {
		daily = 'loading';
	} else {
		dayRows = days
			.map((day, index) => {
				const entries = (fetched.balances[index]?.entries ?? [])
					.filter((entry) => methodIds.has(entry.paymentMethodId))
					.reduce((sum, entry) => sum + entry.amountInCents, 0);

				return {
					id: day.id,
					competence: day.competence,
					totalEntriesInCents: entries,
					totalExpensesInCents: 0,
					netInCents: entries,
				};
			})
			// Dia sem nenhuma entrada com a tag não existe para este filtro.
			.filter((day) => day.totalEntriesInCents > 0);
	}

	return {
		report: {
			...report,
			totalEntriesInCents,
			totalExpensesInCents: 0,
			netInCents: totalEntriesInCents,
			days: dayRows,
			byPaymentMethod,
			byExpenseCategory: [],
		},
		daily,
		loaded: fetched.settled,
		total: days.length,
	};
}
