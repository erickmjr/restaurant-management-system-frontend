'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { DayPage } from '@/components/DayPage';
import { isValidCompetence } from '@/lib/dates';

export default function DayRoute() {
	const { competence } = useParams<{ competence: string }>();
	const router = useRouter();
	const valid = isValidCompetence(competence);

	// Data que não existe não vira tela de erro. Volta para hoje.
	useEffect(() => {
		if (!valid) router.replace('/');
	}, [valid, router]);

	if (!valid) return null;

	return <DayPage key={competence} competence={competence} />;
}
