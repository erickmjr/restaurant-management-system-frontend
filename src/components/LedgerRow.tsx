'use client';

import Link from 'next/link';
import { cx } from '@/lib/cx';
import { formatInstantDate, formatInstantTime } from '@/lib/dates';
import { Button, buttonClass } from './Button';
import { PencilIcon, TrashIcon } from './icons';
import styles from './LedgerRow.module.css';
import { Money } from './Money';

export type LineKind = 'entry' | 'expense';

export interface Line {
	id: string;
	name: string;
	observation: string | null;
	amountInCents: number;
	createdAt: string;
}

interface LedgerRowProps {
	kind: LineKind;
	line: Line;
	competence: string;
	/** Página aberta, e a linha é do próprio operador ou quem olha é dono. */
	editable: boolean;
	locked: boolean;
	/** Linha recém-lançada, que assenta na lista. */
	settling: boolean;
	open: boolean;
	confirming: boolean;
	removing: boolean;
	error: string | null;
	onToggle: () => void;
	onAskRemove: () => void;
	onKeep: () => void;
	onRemove: () => void;
}

const SLUG: Record<LineKind, string> = { entry: 'entrada', expense: 'saida' };

/** Uma linha do caderno. Nome à esquerda, valor em mono à direita, régua embaixo. */
export function LedgerRow({
	kind,
	line,
	competence,
	editable,
	locked,
	settling,
	open,
	confirming,
	removing,
	error,
	onToggle,
	onAskRemove,
	onKeep,
	onRemove,
}: LedgerRowProps) {
	const content = (
		<>
			<span className={styles.text}>
				<span className={styles.name}>{line.name}</span>
				{line.observation !== null && <span className={styles.note}>{line.observation}</span>}
			</span>
			<Money cents={line.amountInCents} tone={kind} />
		</>
	);

	return (
		<li className={cx(styles.row, locked && styles.locked, settling && styles.settling)}>
			{/* Sem permissão não há botão. A ação some, não fica desabilitada. */}
			{editable ? (
				<button type="button" className={styles.main} aria-expanded={open} onClick={onToggle}>
					{content}
				</button>
			) : (
				<div className={styles.main}>{content}</div>
			)}

			{editable && open && !confirming && (
				<div className={styles.tray}>
					<span className={styles.when}>
						{formatInstantDate(line.createdAt)} {formatInstantTime(line.createdAt)}
					</span>
					<span className={styles.actions}>
						<Link
							className={buttonClass('outline', 'small')}
							href={`/dia/${competence}/corrigir/${SLUG[kind]}/${line.id}`}
						>
							<PencilIcon />
							Corrigir
						</Link>
						<Button variant="outline" size="small" onClick={onAskRemove}>
							<TrashIcon />
							Remover
						</Button>
					</span>
				</div>
			)}

			{/* Remover apaga de verdade. A pergunta acontece aqui na linha, não num modal. */}
			{editable && open && confirming && (
				<div className={styles.confirm} role="group" aria-label="Confirmar remoção">
					<p className={styles.question}>
						Remover este lançamento? Ele sai do dia e dos relatórios e não pode ser recuperado.
					</p>
					<span className={styles.actions}>
						<Button
							variant="outline"
							size="small"
							className={styles.danger}
							onClick={onRemove}
							disabled={removing}
						>
							<TrashIcon />
							{removing ? 'Removendo' : 'Sim, remover'}
						</Button>
						<Button variant="outline" size="small" onClick={onKeep} disabled={removing} autoFocus>
							Cancelar
						</Button>
					</span>
					{error !== null && (
						<p className="error" role="alert">
							{error}
						</p>
					)}
				</div>
			)}
		</li>
	);
}
