'use client';

import { useEffect, useState } from 'react';
import { todayCompetence } from '@/lib/dates';

/** Relógio que anda sozinho. Serve para a contagem da janela e para a virada do dia. */
export function useNow(intervalMs = 30_000): number {
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		const tick = () => setNow(Date.now());
		const timer = window.setInterval(tick, intervalMs);

		// Celular que ficou no bolso volta com o relógio certo.
		document.addEventListener('visibilitychange', tick);

		return () => {
			window.clearInterval(timer);
			document.removeEventListener('visibilitychange', tick);
		};
	}, [intervalMs]);

	return now;
}

export function useToday(): string {
	return todayCompetence(useNow());
}
