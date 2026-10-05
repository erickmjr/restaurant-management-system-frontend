'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { LoginResponse, Operator } from '@/lib/api/types';

export const SESSION_STORAGE_KEY = 'caixa.sessao';

interface SessionState {
	token: string | null;
	operator: Operator | null;
	/** Sobrevive ao sair, para o login não pedir o código do restaurante de novo. */
	lastRestaurantId: string | null;
	/** Nome do restaurante guardado, para o login e o índice mostrarem sem esperar a API. */
	restaurantName: string | null;
	/** Vira true depois de ler o localStorage. Antes disso ninguém decide rota. */
	hydrated: boolean;
	signIn: (login: LoginResponse) => void;
	/** Sessão de demonstração. Não toca no restaurante guardado para o login de verdade. */
	enterDemo: (login: LoginResponse) => void;
	rememberRestaurantName: (name: string) => void;
	signOut: () => void;
}

export const useSession = create<SessionState>()(
	persist(
		(set) => ({
			token: null,
			operator: null,
			lastRestaurantId: null,
			restaurantName: null,
			hydrated: false,
			// Entrar em outro restaurante esquece o nome do anterior.
			signIn: ({ token, operator }) =>
				set((state) => ({
					token,
					operator,
					lastRestaurantId: operator.restaurantId,
					restaurantName:
						state.lastRestaurantId === operator.restaurantId ? state.restaurantName : null,
				})),
			rememberRestaurantName: (name) => set({ restaurantName: name }),
			enterDemo: ({ token, operator }) => set({ token, operator }),
			signOut: () => set({ token: null, operator: null }),
		}),
		{
			name: SESSION_STORAGE_KEY,
			storage: createJSONStorage(() => localStorage),
			partialize: ({ token, operator, lastRestaurantId, restaurantName }) => ({
				token,
				operator,
				lastRestaurantId,
				restaurantName,
			}),
			// O servidor não tem localStorage. A leitura acontece no cliente, em Providers.
			skipHydration: true,
		},
	),
);
