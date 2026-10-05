'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Register } from '@/components/Register';
import { useToday } from '@/hooks/useNow';
import { isValidCompetence } from '@/lib/dates';
import { kindFromSlug } from '@/lib/kinds';

export default function LaunchRoute() {
	const { competence, tipo } = useParams<{ competence: string; tipo: string }>();
	const router = useRouter();
	const today = useToday();
	const kind = kindFromSlug(tipo);

	// Competência depois de hoje a API recusa, então a máquina nem abre.
	const valid = kind !== null && isValidCompetence(competence) && competence <= today;

	useEffect(() => {
		if (!valid) router.replace('/');
	}, [valid, router]);

	if (!valid || kind === null) return null;

	return <Register key={`${kind}-${competence}`} kind={kind} competence={competence} />;
}
