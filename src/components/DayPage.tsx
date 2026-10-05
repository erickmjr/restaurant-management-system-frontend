'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useNow } from '@/hooks/useNow';
import { messageOf } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import { refreshLedger, useBalance, useMe } from '@/lib/api/queries';
import type { Balance } from '@/lib/api/types';
import {
	addDays,
	capitalize,
	dayHref,
	describeTimeLeft,
	formatInstantDate,
	formatLongDate,
	todayCompetence,
} from '@/lib/dates';
import { formatCents } from '@/lib/money';
import { useLedger } from '@/stores/ledger';
import { Button } from './Button';
import styles from './DayPage.module.css';
import { DayPicker } from './DayPicker';
import { CalendarIcon, ChevronLeft, ChevronRight } from './icons';
import { LaunchActions } from './LaunchActions';
import { LedgerRow, type Line, type LineKind } from './LedgerRow';
import { Money } from './Money';
import { Sheet, type SheetMargin } from './Sheet';
import { Stamp } from './Stamp';

interface OpenRow {
	id: string;
	confirming: boolean;
}

interface Section {
	kind: LineKind;
	title: string;
	empty: string;
	lines: Array<Line & { operatorId: string }>;
}

function sectionsOf(balance: Balance): Section[] {
	return [
		{
			kind: 'entry',
			title: 'Entradas',
			empty: 'Nenhuma entrada',
			lines: balance.entries.map((entry) => ({
				id: entry.id,
				operatorId: entry.operatorId,
				name: entry.paymentMethodName,
				observation: entry.observation,
				amountInCents: entry.amountInCents,
				createdAt: entry.createdAt,
			})),
		},
		{
			kind: 'expense',
			title: 'Saídas',
			empty: 'Nenhuma saída',
			lines: balance.expenses.map((expense) => ({
				id: expense.id,
				operatorId: expense.operatorId,
				name: expense.expenseCategoryName,
				observation: expense.observation,
				amountInCents: expense.amountInCents,
				createdAt: expense.createdAt,
			})),
		},
	];
}

const BLANK_LINES = ['a', 'b', 'c', 'd', 'e', 'f'];

/** A página do caderno. Data no alto, uma linha por lançamento, total no pé. */
export function DayPage({ competence }: { competence: string }) {
	const router = useRouter();
	const now = useNow();
	const today = todayCompetence(now);
	const me = useMe();
	const client = useQueryClient();
	const query = useBalance(competence);
	const settledLineId = useLedger((state) => state.settledLineId);
	const clearSettled = useLedger((state) => state.clearSettled);
	const [openRow, setOpenRow] = useState<OpenRow | null>(null);
	const [picking, setPicking] = useState(false);

	const balance = query.data ?? null;
	const isFuture = competence > today;

	// A janela conta do nascimento do balanço. O servidor manda, e o relógio local
	// só adianta a trava se a aba ficou aberta até a página fechar.
	const timeLeft = balance === null ? null : describeTimeLeft(balance.lockedAt, now);
	const locked = balance !== null && (balance.isLocked || timeLeft === null);
	const margin: SheetMargin = balance === null ? 'plain' : locked ? 'locked' : 'open';
	const canPost = query.isSuccess && !locked && !isFuture;

	const remove = useMutation({
		mutationFn: ({ kind, id }: { kind: LineKind; id: string }) =>
			kind === 'entry' ? api.removeEntry(id) : api.removeExpense(id),
		onSuccess: () => {
			setOpenRow(null);

			return refreshLedger(client, competence);
		},
		// Se a recusa foi por trava ou por sumiço da linha, a página precisa se atualizar.
		onError: () => refreshLedger(client, competence),
	});

	// A marca de linha nova dura só o tempo de assentar.
	useEffect(() => {
		if (settledLineId === null) return;

		const timer = window.setTimeout(clearSettled, 1200);

		return () => window.clearTimeout(timer);
	}, [settledLineId, clearSettled]);

	function toggle(id: string) {
		remove.reset();
		setOpenRow((current) => (current?.id === id ? null : { id, confirming: false }));
	}

	return (
		<>
			<Sheet margin={margin}>
				<header className={styles.header}>
					<div className={styles.heading}>
						<h1 className={styles.date}>{capitalize(formatLongDate(competence, today))}</h1>

						<div className={styles.meta}>
							<Link
								className={styles.turn}
								href={dayHref(addDays(competence, -1), today)}
								aria-label="Página do dia anterior"
							>
								<ChevronLeft />
							</Link>
							<span className={styles.iso}>{competence}</span>
							{competence < today && (
								<Link
									className={styles.turn}
									href={dayHref(addDays(competence, 1), today)}
									aria-label="Página do dia seguinte"
								>
									<ChevronRight />
								</Link>
							)}
							<button
								type="button"
								className={styles.search}
								aria-expanded={picking}
								onClick={() => setPicking((current) => !current)}
							>
								<CalendarIcon />
								Procurar dia
							</button>
						</div>

						{/* A nota da margem. Anotação em ocre, não banner. Ocre é sempre tempo acabando. */}
						{balance !== null && !locked && timeLeft !== null && (
							<p className={styles.window}>Esta página fecha em {timeLeft}</p>
						)}
						{isFuture && <p className={styles.quiet}>Data futura, ainda sem lançamentos</p>}
					</div>

					{/* No computador os botões de lançar moram aqui. No celular, no pé da tela. */}
					{canPost && <LaunchActions competence={competence} className={styles.headerActions} />}
				</header>

				{picking && (
					<DayPicker
						selected={competence}
						today={today}
						onPick={(day) => {
							setPicking(false);
							router.push(dayHref(day, today));
						}}
					/>
				)}

				{query.isPending && (
					<div className={styles.blank}>
						<p className="sr-only">Carregando a página.</p>
						<ul aria-hidden="true">
							{BLANK_LINES.map((line) => (
								<li key={line} className={styles.blankLine} />
							))}
						</ul>
					</div>
				)}

				{query.isError && (
					<div className={styles.failure} role="alert">
						<p className="error">Não foi possível abrir esta página. {messageOf(query.error)}</p>
						<Button variant="outline" size="small" onClick={() => void query.refetch()}>
							Tentar novamente
						</Button>
					</div>
				)}

				{/* 404 em balanço é página em branco. As réguas ficam, a data fica, e mais nada. */}
				{query.isSuccess && balance === null && (
					<div className={styles.blank}>
						{!isFuture && <p className={styles.nothing}>Nenhum lançamento neste dia</p>}
						<ul aria-hidden="true">
							{BLANK_LINES.map((line) => (
								<li key={line} className={styles.blankLine} />
							))}
						</ul>
					</div>
				)}

				{balance !== null && (
					<div className={styles.frame}>
						<div className={styles.body}>
							{sectionsOf(balance).map((section) => (
								<section key={section.kind} className={styles.section}>
									<h2 className={styles.sectionTitle}>{section.title}</h2>
									{section.lines.length === 0 ? (
										<p className={styles.nothing}>{section.empty}</p>
									) : (
										<ul>
											{section.lines.map((line) => (
												<LedgerRow
													key={line.id}
													kind={section.kind}
													line={line}
													competence={competence}
													// Funcionário só mexe no que ele mesmo lançou. Dono mexe em tudo.
													editable={!locked && (me.isOwner || line.operatorId === me.operatorId)}
													locked={locked}
													settling={line.id === settledLineId}
													open={openRow?.id === line.id}
													confirming={openRow?.id === line.id && openRow.confirming}
													removing={remove.isPending}
													error={remove.isError ? messageOf(remove.error) : null}
													onToggle={() => toggle(line.id)}
													onAskRemove={() => setOpenRow({ id: line.id, confirming: true })}
													onKeep={() => {
														remove.reset();
														setOpenRow({ id: line.id, confirming: false });
													}}
													onRemove={() => remove.mutate({ kind: section.kind, id: line.id })}
												/>
											))}
										</ul>
									)}
								</section>
							))}

							{/* Contabilidade de verdade. Régua simples em cada subtotal, dupla antes do saldo. */}
							<footer className={styles.totals} data-locked={locked}>
								{locked && <Stamp date={formatInstantDate(balance.lockedAt)} />}
								<div className={styles.subtotal}>
									<span>Entrou</span>
									<Money cents={balance.totalEntriesInCents} tone="entry" />
								</div>
								<div className={styles.subtotal}>
									<span>Saiu</span>
									<Money cents={balance.totalExpensesInCents} tone="expense" />
								</div>
								<div className={styles.net}>
									<span className="label">Saldo do dia</span>
									<Money cents={balance.netInCents} tone="net" serif />
								</div>
							</footer>
						</div>
					</div>
				)}

				<p className="sr-only" aria-live="polite">
					{balance !== null && `Saldo do dia, ${formatCents(balance.netInCents)}.`}
				</p>

				{canPost && <div className={styles.dockSpace} />}
			</Sheet>

			{canPost && (
				<div className={styles.dock}>
					<LaunchActions competence={competence} />
				</div>
			)}
		</>
	);
}
