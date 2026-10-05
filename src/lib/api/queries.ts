'use client';

import { keepPreviousData, type QueryClient, useQuery } from '@tanstack/react-query';
import { isDemoToken } from '@/lib/demo';
import { useSession } from '@/stores/session';
import { api } from './endpoints';
import type { Role } from './types';

export const PRODUCT_NAME = 'Livro de caixa';

export const keys = {
	me: ['me'] as const,
	restaurant: ['restaurant'] as const,
	balance: (competence: string) => ['balance', competence] as const,
	reports: ['report'] as const,
	report: (from: string, to: string) => ['report', from, to] as const,
	paymentMethods: ['payment-methods'] as const,
	expenseCategories: ['expense-categories'] as const,
	paymentTags: ['payment-tags'] as const,
};

export function useBalance(competence: string, enabled = true) {
	return useQuery({
		queryKey: keys.balance(competence),
		queryFn: () => api.balance(competence),
		enabled,
	});
}

export function useReport(from: string, to: string) {
	return useQuery({
		queryKey: keys.report(from, to),
		queryFn: () => api.report(from, to),
		enabled: from <= to,
		// Trocar de período segura o quadro anterior até o novo chegar, sem piscar vazio.
		placeholderData: keepPreviousData,
	});
}

export function usePaymentMethods(enabled = true) {
	return useQuery({ queryKey: keys.paymentMethods, queryFn: api.paymentMethods, enabled });
}

export function useExpenseCategories(enabled = true) {
	return useQuery({ queryKey: keys.expenseCategories, queryFn: api.expenseCategories, enabled });
}

export function usePaymentTags(enabled = true) {
	return useQuery({ queryKey: keys.paymentTags, queryFn: api.paymentTags, enabled });
}

export interface Identity {
	operatorId: string | null;
	role: Role;
	isOwner: boolean;
}

/**
 * Quem está usando. O login já entrega o operador, então a tela não espera.
 * O /me confirma em segundo plano e é ele que vale quando responde.
 */
export function useMe(): Identity {
	const operator = useSession((state) => state.operator);
	const { data } = useQuery({ queryKey: keys.me, queryFn: api.me, staleTime: 5 * 60_000 });

	const role = data?.role ?? operator?.role ?? 'EMPLOYEE';

	return {
		operatorId: data?.operatorId ?? operator?.id ?? null,
		role,
		isOwner: role === 'OWNER',
	};
}

/**
 * O nome do restaurante. Vem da API quando ela souber dizer, e fica guardado
 * no aparelho para a próxima vez. Sem nome, cai no nome do produto.
 */
export function useRestaurantName(): string {
	const demo = useSession((state) => isDemoToken(state.token));
	const remembered = useSession((state) => state.restaurantName);
	const { data } = useQuery({
		queryKey: keys.restaurant,
		queryFn: async () => {
			const restaurant = await api.restaurant();

			// O nome da demonstração não pode vazar para o login de verdade.
			if (restaurant !== null && !isDemoToken(useSession.getState().token)) {
				useSession.getState().rememberRestaurantName(restaurant.name);
			}

			return restaurant;
		},
		staleTime: Number.POSITIVE_INFINITY,
		retry: false,
	});

	return data?.name ?? (demo ? null : remembered) ?? PRODUCT_NAME;
}

/** Depois de qualquer mudança em lançamento, o dia e os relatórios ficam velhos. */
export function refreshLedger(client: QueryClient, competence: string): Promise<void> {
	void client.invalidateQueries({ queryKey: keys.reports });

	return client.invalidateQueries({ queryKey: keys.balance(competence) });
}
