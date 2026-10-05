'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useEffectEvent, useId, useRef, useState } from 'react';
import { useNow } from '@/hooks/useNow';
import { messageOf } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import {
	refreshLedger,
	useBalance,
	useExpenseCategories,
	useMe,
	usePaymentMethods,
} from '@/lib/api/queries';
import type { UpdateEntryBody, UpdateExpenseBody } from '@/lib/api/types';
import { dayHref, formatLongDate, isValidCompetence, todayCompetence } from '@/lib/dates';
import { formatCents, popDigit, pushDigit, splitCents } from '@/lib/money';
import { useLedger } from '@/stores/ledger';
import { byUsage, useUsage } from '@/stores/usage';
import { Chip, chipRowClass } from './Chip';
import { inputClass } from './Field';
import { ChevronLeft, MinusCircle, PlusCircle } from './icons';
import { Keypad } from './Keypad';
import type { LineKind } from './LedgerRow';
import styles from './Register.module.css';

/** Lançamento que está sendo corrigido. Sem isso, a máquina lança um novo. */
export interface Editing {
	id: string;
	amountInCents: number;
	optionId: string;
	observation: string | null;
}

interface RegisterProps {
	kind: LineKind;
	competence: string;
	editing?: Editing;
}

const COPY = {
	entry: {
		title: 'Lançar entrada',
		correcting: 'Corrigir entrada',
		options: 'Método de pagamento',
		missing: 'Escolha o método de pagamento.',
		none: 'Nenhum método de pagamento cadastrado.',
	},
	expense: {
		title: 'Lançar saída',
		correcting: 'Corrigir saída',
		options: 'Categoria',
		missing: 'Escolha a categoria.',
		none: 'Nenhuma categoria de saída cadastrada.',
	},
} as const;

// A escala tipográfica do briefing. O display desce um degrau quando o valor não cabe.
const DISPLAY_SIZES = [64, 44, 28] as const;
const MONO_ADVANCE = 0.6;

function fitDisplay(characters: number, available: number, prefix: number): number {
	if (available === 0) return DISPLAY_SIZES[0];

	for (const size of DISPLAY_SIZES) {
		if (characters * size * MONO_ADVANCE + prefix <= available) return size;
	}

	return DISPLAY_SIZES[2];
}

/**
 * A máquina de registrar. Uma tela só, sem passo a passo.
 * Os dígitos entram pela direita, em centavos, então o valor que vai para a API
 * nunca passa por decimal e nunca arredonda.
 */
export function Register({ kind, competence, editing }: RegisterProps) {
	const router = useRouter();
	const client = useQueryClient();
	const now = useNow();
	const today = todayCompetence(now);
	const me = useMe();
	const markSettled = useLedger((state) => state.markSettled);
	const copy = COPY[kind];
	const optionsLabelId = useId();

	const [cents, setCents] = useState(editing?.amountInCents ?? 0);
	const [optionId, setOptionId] = useState<string | null>(editing?.optionId ?? null);
	const [day, setDay] = useState(competence);
	const [pickingDay, setPickingDay] = useState(false);
	const [note, setNote] = useState(editing?.observation ?? '');
	const [noteOpen, setNoteOpen] = useState((editing?.observation ?? null) !== null);
	const [hint, setHint] = useState<string | null>(null);

	const methods = usePaymentMethods(kind === 'entry');
	const categories = useExpenseCategories(kind === 'expense');
	const options = kind === 'entry' ? methods : categories;

	// Foto do uso na hora em que a máquina abre. A ordem não muda debaixo do dedo.
	const [usage] = useState(() => useUsage.getState().counts);
	const ordered = byUsage(options.data ?? [], usage);

	// A página do dia escolhido pode já ter fechado. Melhor saber antes de bater no 422.
	const dayBalance = useBalance(day);
	const dayLocked =
		dayBalance.data != null &&
		(dayBalance.data.isLocked || Date.parse(dayBalance.data.lockedAt) <= now);

	const displayRef = useRef<HTMLDivElement>(null);
	const [displayWidth, setDisplayWidth] = useState(0);

	useEffect(() => {
		const element = displayRef.current;

		if (element === null) return;

		const observer = new ResizeObserver(([entry]) => {
			if (entry !== undefined) setDisplayWidth(entry.contentRect.width);
		});

		observer.observe(element);

		return () => observer.disconnect();
	}, []);

	const save = useMutation({
		mutationFn: async (): Promise<string | null> => {
			if (optionId === null) return null;

			const observation = note.trim() === '' ? null : note.trim();

			if (editing !== undefined) {
				// Só vai o que mudou. Campo omitido mantém, e observation null limpa.
				const patch: UpdateEntryBody & UpdateExpenseBody = {};

				if (cents !== editing.amountInCents) patch.amountInCents = cents;
				if (observation !== editing.observation) patch.observation = observation;

				if (optionId !== editing.optionId) {
					if (kind === 'entry') patch.paymentMethodId = optionId;
					else patch.expenseCategoryId = optionId;
				}

				if (Object.keys(patch).length > 0) {
					await (kind === 'entry'
						? api.updateEntry(editing.id, patch)
						: api.updateExpense(editing.id, patch));
				}

				return null;
			}

			if (kind === 'entry') {
				const created = await api.createEntry({
					competence: day,
					paymentMethodId: optionId,
					amountInCents: cents,
					observation,
				});

				useUsage.getState().bump(optionId);

				return created.entryId;
			}

			const created = await api.createExpense({
				competence: day,
				expenseCategoryId: optionId,
				amountInCents: cents,
				observation,
			});

			useUsage.getState().bump(optionId);

			return created.expenseId;
		},
		// Sem toast e sem modal. Volta para a página do dia, e a linha nova é a confirmação.
		onSuccess: async (lineId) => {
			if (lineId !== null) markSettled(lineId);

			await refreshLedger(client, day);
			router.replace(dayHref(day, today));
		},
		onError: () => refreshLedger(client, day),
	});

	function press(digit: number) {
		setHint(null);
		setCents((current) => pushDigit(current, digit));
	}

	function erase() {
		setHint(null);
		setCents(popDigit);
	}

	function confirm() {
		if (save.isPending || dayLocked) return;

		if (cents === 0) {
			setHint('Digite o valor.');

			return;
		}

		if (optionId === null) {
			setHint(copy.missing);

			return;
		}

		setHint(null);
		save.mutate();
	}

	// Teclado de verdade também digita. Dígito, Backspace e Enter.
	const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
		if (event.metaKey || event.ctrlKey || event.altKey) return;

		const tag = event.target instanceof HTMLElement ? event.target.tagName : '';

		if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

		if (/^[0-9]$/.test(event.key)) {
			event.preventDefault();
			press(Number(event.key));
		} else if (event.key === 'Backspace') {
			event.preventDefault();
			erase();
		} else if (event.key === 'Enter' && tag !== 'BUTTON' && tag !== 'A') {
			event.preventDefault();
			confirm();
		}
	});

	useEffect(() => {
		const listener = (event: KeyboardEvent) => onKeyDown(event);

		window.addEventListener('keydown', listener);

		return () => window.removeEventListener('keydown', listener);
	}, []);

	const { reais, cents: fraction } = splitCents(cents);
	const digits = `${reais},${fraction}`;
	const prefixWidth = kind === 'expense' ? 80 : 48;
	const displaySize = fitDisplay(digits.length, displayWidth, prefixWidth);
	const otherDay = day !== today;
	const ready = cents > 0 && optionId !== null && !dayLocked;
	const message = hint ?? (save.isError ? messageOf(save.error) : null);
	const KindIcon = kind === 'entry' ? PlusCircle : MinusCircle;

	return (
		<main className={styles.machine}>
			<header className={styles.top}>
				<Link className={styles.back} href={dayHref(competence, today)}>
					<ChevronLeft />
					Voltar
				</Link>
				{/* O título diz o que a tela faz, com o mesmo sinal do botão que trouxe até aqui. */}
				<h1 className={styles.kind} data-kind={kind}>
					<KindIcon />
					{editing === undefined ? copy.title : copy.correcting}
				</h1>
			</header>

			<div className={styles.panes}>
				<div className={styles.pane}>
					<div className={styles.slack} />

					<section className={styles.readout} aria-label="Valor">
						<div ref={displayRef} className={styles.display} data-kind={kind} data-idle={cents === 0}>
							<span className="sr-only" aria-live="polite">
								{formatCents(cents)}
							</span>
							<span className={styles.prefix} aria-hidden="true">
								{kind === 'expense' && <span className={styles.minus}>−</span>}
								R$
							</span>
							<span className={styles.digits} style={{ fontSize: displaySize }} aria-hidden="true">
								{digits}
							</span>
						</div>

						{/* Lançar no dia errado é o erro mais caro daqui. Dia que não é hoje aparece em ocre. */}
						<div className={styles.dayLine}>
							<span className={otherDay ? styles.otherDay : styles.sameDay}>
								{otherDay ? `Na página de ${formatLongDate(day, today)}` : 'Na página de hoje'}
							</span>
							{editing === undefined && (
								<button
									type="button"
									className="link"
									aria-expanded={pickingDay}
									onClick={() => setPickingDay((current) => !current)}
								>
									Outro dia
								</button>
							)}
						</div>

						{pickingDay && (
							<input
								type="date"
								className={`${inputClass} ${styles.dayInput}`}
								aria-label="Dia do lançamento"
								value={day}
								max={today}
								onChange={(event) => {
									const value = event.target.value;

									if (isValidCompetence(value)) setDay(value > today ? today : value);
								}}
							/>
						)}

						{dayLocked && (
							<p className="error" role="alert">
								Esta página já fechou e não aceita mais lançamento.
							</p>
						)}
					</section>

					<section className={styles.options}>
						<span id={optionsLabelId} className="label">
							{copy.options}
						</span>

						{ordered.length > 0 && (
							<div role="radiogroup" aria-labelledby={optionsLabelId} className={chipRowClass}>
								{ordered.map((option) => (
									<Chip
										key={option.id}
										selected={option.id === optionId}
										onClick={() => {
											setHint(null);
											setOptionId(option.id);
										}}
									>
										{option.name}
									</Chip>
								))}
							</div>
						)}

						{options.isPending && <div className={styles.optionsBlank} aria-hidden="true" />}

						{options.isSuccess && options.data.length === 0 && (
							<p className={styles.empty}>
								{copy.none}{' '}
								{me.isOwner ? (
									<Link href="/catalogos">Cadastrar em catálogos</Link>
								) : (
									'Peça ao dono para cadastrar.'
								)}
							</p>
						)}

						{options.isError && (
							<p className="error" role="alert">
								{messageOf(options.error)}{' '}
								<button type="button" className="link" onClick={() => void options.refetch()}>
									Tentar novamente
								</button>
							</p>
						)}
					</section>

					<div className={styles.note}>
						{noteOpen ? (
							<input
								className={inputClass}
								aria-label="Observação"
								placeholder="Observação"
								maxLength={500}
								value={note}
								onChange={(event) => setNote(event.target.value)}
								enterKeyHint="done"
							/>
						) : (
							<button type="button" className="link" onClick={() => setNoteOpen(true)}>
								Adicionar observação
							</button>
						)}
					</div>

					<p className={`error ${styles.message}`} role="alert">
						{message}
					</p>
				</div>

				<div className={styles.keys}>
					<Keypad
						onDigit={press}
						onErase={erase}
						onConfirm={confirm}
						confirmLabel={
							save.isPending
								? editing === undefined
									? 'Lançando'
									: 'Corrigindo'
								: editing === undefined
									? 'Lançar'
									: 'Corrigir'
						}
						ready={ready}
						busy={save.isPending}
					/>
				</div>
			</div>
		</main>
	);
}
