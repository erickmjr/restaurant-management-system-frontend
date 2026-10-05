'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { type Editing, Register } from '@/components/Register';
import { useNow } from '@/hooks/useNow';
import { useBalance, useMe } from '@/lib/api/queries';
import type { Balance } from '@/lib/api/types';
import { dayHref, isValidCompetence } from '@/lib/dates';
import { kindFromSlug } from '@/lib/kinds';

interface Found {
	operatorId: string;
	editing: Editing;
}

function findLine(balance: Balance, kind: 'entry' | 'expense', id: string): Found | null {
	if (kind === 'entry') {
		const entry = balance.entries.find((line) => line.id === id);

		return entry === undefined
			? null
			: {
					operatorId: entry.operatorId,
					editing: {
						id: entry.id,
						amountInCents: entry.amountInCents,
						optionId: entry.paymentMethodId,
						observation: entry.observation,
					},
				};
	}

	const expense = balance.expenses.find((line) => line.id === id);

	return expense === undefined
		? null
		: {
				operatorId: expense.operatorId,
				editing: {
					id: expense.id,
					amountInCents: expense.amountInCents,
					optionId: expense.expenseCategoryId,
					observation: expense.observation,
				},
			};
}

export default function CorrectRoute() {
	const { competence, tipo, id } = useParams<{ competence: string; tipo: string; id: string }>();
	const router = useRouter();
	const now = useNow();
	const me = useMe();
	const kind = kindFromSlug(tipo);
	const valid = kind !== null && isValidCompetence(competence);
	const query = useBalance(competence, valid);

	const balance = query.data ?? null;
	const found = balance !== null && kind !== null ? findLine(balance, kind, id) : null;
	const locked = balance !== null && (balance.isLocked || Date.parse(balance.lockedAt) <= now);

	// As mesmas regras que escondem o botão na página do dia valem para a URL digitada à mão.
	const allowed =
		found !== null && !locked && (me.isOwner || found.operatorId === me.operatorId);
	const settled = !valid || query.isSuccess || query.isError;

	useEffect(() => {
		if (settled && !allowed) router.replace(valid ? dayHref(competence) : '/');
	}, [settled, allowed, valid, competence, router]);

	if (!allowed || found === null || kind === null) return null;

	return <Register key={found.editing.id} kind={kind} competence={competence} editing={found.editing} />;
}
