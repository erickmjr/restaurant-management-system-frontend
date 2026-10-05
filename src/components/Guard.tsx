'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';
import { useMe } from '@/lib/api/queries';
import { useSession } from '@/stores/session';

/**
 * Guarda de rota. Sem token, vai para o login sem drama.
 * Enquanto a sessão não foi lida do localStorage, mostra só o papel.
 */
export function Guard({ children }: { children: ReactNode }) {
	const router = useRouter();
	const hydrated = useSession((state) => state.hydrated);
	const signedIn = useSession((state) => state.token !== null);

	useEffect(() => {
		if (hydrated && !signedIn) router.replace('/entrar');
	}, [hydrated, signedIn, router]);

	if (!hydrated || !signedIn) return null;

	return <>{children}</>;
}

/** Telas de dono. Para o funcionário elas não existem, então ele volta para o dia. */
export function OwnerOnly({ children }: { children: ReactNode }) {
	const router = useRouter();
	const { isOwner } = useMe();

	useEffect(() => {
		if (!isOwner) router.replace('/');
	}, [isOwner, router]);

	if (!isOwner) return null;

	return <>{children}</>;
}
