'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface UsageState {
	/** Quantas vezes cada método ou categoria foi lançado neste aparelho. */
	counts: Record<string, number>;
	bump: (optionId: string) => void;
}

/**
 * O funcionário usa três ou quatro métodos, e eles têm que estar a um toque.
 * A API devolve o catálogo em ordem alfabética, então a máquina lembra o que
 * este aparelho mais lança e põe na frente da fileira.
 */
export const useUsage = create<UsageState>()(
	persist(
		(set) => ({
			counts: {},
			bump: (optionId) =>
				set((state) => ({
					counts: { ...state.counts, [optionId]: (state.counts[optionId] ?? 0) + 1 },
				})),
		}),
		{ name: 'caixa.uso', storage: createJSONStorage(() => localStorage) },
	),
);

/** Mais usados primeiro. Empate mantém a ordem que veio da API. */
export function byUsage<T extends { id: string }>(items: T[], counts: Record<string, number>): T[] {
	return [...items].sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0));
}
