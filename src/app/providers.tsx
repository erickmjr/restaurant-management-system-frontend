'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useEffect, useState } from 'react';
import { ApiError } from '@/lib/api/client';
import { SESSION_STORAGE_KEY, useSession } from '@/stores/session';

function createQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 15_000,
				refetchOnWindowFocus: true,
				// Erro de regra ou de permissão não muda se tentar de novo. Só rede merece outra chance.
				retry: (failures, error) => {
					if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;

					return failures < 2;
				},
			},
			mutations: { retry: false },
		},
	});
}

export function Providers({ children }: { children: ReactNode }) {
	const [client] = useState(createQueryClient);

	// Lê a sessão do localStorage uma vez, no cliente, e libera as guardas de rota.
	useEffect(() => {
		const finish = () => useSession.setState({ hydrated: true });

		Promise.resolve(useSession.persist.rehydrate()).then(finish, finish);

		// Sair numa aba sai em todas.
		const onStorage = (event: StorageEvent) => {
			if (event.key === SESSION_STORAGE_KEY) void useSession.persist.rehydrate();
		};

		window.addEventListener('storage', onStorage);

		return () => window.removeEventListener('storage', onStorage);
	}, []);

	// Trocar de sessão não pode deixar dado de outro restaurante no cache.
	useEffect(
		() =>
			useSession.subscribe((state, previous) => {
				if (state.token !== previous.token) client.clear();
			}),
		[client],
	);

	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
