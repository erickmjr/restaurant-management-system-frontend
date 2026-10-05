import Link from 'next/link';
import { cx } from '@/lib/cx';
import { MinusCircle, PlusCircle } from './icons';
import styles from './LaunchActions.module.css';

interface LaunchActionsProps {
	competence: string;
	className?: string;
}

/**
 * Os dois botões de lançar. Cada um diz por extenso o que faz e leva o sinal
 * da conta, mais para o que entra e menos para o que sai. O mesmo menos que
 * acompanha toda saída no livro.
 */
export function LaunchActions({ competence, className }: LaunchActionsProps) {
	return (
		<div className={cx(styles.actions, className)}>
			<Link className={cx(styles.action, styles.entry)} href={`/dia/${competence}/lancar/entrada`}>
				<PlusCircle />
				<span>Lançar entrada</span>
			</Link>
			<Link className={cx(styles.action, styles.expense)} href={`/dia/${competence}/lancar/saida`}>
				<MinusCircle />
				<span>Lançar saída</span>
			</Link>
		</div>
	);
}
