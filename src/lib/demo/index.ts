import type { LoginResponse } from '@/lib/api/types';

/**
 * Modo de demonstração. Serve para navegar pelas telas sem login e sem API,
 * com dados de mentira que vivem só no navegador.
 *
 * Ele existe em desenvolvimento. Em produção só existe se o build pedir,
 * com NEXT_PUBLIC_DEMO=1.
 */
export const DEMO_AVAILABLE =
	process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_DEMO === '1';

const TOKEN_PREFIX = 'demo-';

/** A sessão é que decide. Token de demonstração fala com a API de mentira, qualquer outro fala com a de verdade. */
export function isDemoToken(token: string | null): token is string {
	return DEMO_AVAILABLE && token !== null && token.startsWith(TOKEN_PREFIX);
}

export type DemoRole = 'owner' | 'employee';

export const DEMO_LOGINS: Record<DemoRole, LoginResponse> = {
	owner: {
		token: 'demo-owner',
		operator: {
			id: 'op-dono',
			name: 'Érick',
			email: 'dono@demo.local',
			role: 'OWNER',
			restaurantId: '7b1f0c52-3a6d-4e1a-9c3d-2f8e5a41c7b9',
		},
	},
	employee: {
		token: 'demo-employee',
		operator: {
			id: 'op-funcionaria',
			name: 'Bia',
			email: 'bia@demo.local',
			role: 'EMPLOYEE',
			restaurantId: '7b1f0c52-3a6d-4e1a-9c3d-2f8e5a41c7b9',
		},
	},
};
