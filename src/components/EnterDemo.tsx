'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { DEMO_LOGINS, type DemoRole } from '@/lib/demo';
import { useSession } from '@/stores/session';

/** Abre uma sessão de demonstração e vai para a página de hoje. Não tem tela. */
export function EnterDemo({ as }: { as: DemoRole }) {
	const router = useRouter();
	const hydrated = useSession((state) => state.hydrated);
	const enterDemo = useSession((state) => state.enterDemo);

	useEffect(() => {
		if (!hydrated) return;

		enterDemo(DEMO_LOGINS[as]);
		router.replace('/');
	}, [hydrated, enterDemo, as, router]);

	return null;
}
