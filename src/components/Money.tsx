import { cx } from '@/lib/cx';
import { formatCents, splitCents } from '@/lib/money';
import styles from './Money.module.css';

/**
 * plain, valor sem sinal de natureza.
 * entry, entrada, reais em verde.
 * expense, saída, sinal de menos visível e vermelho. O valor chega positivo.
 * net, saldo, e saldo negativo vem entre parênteses como em contabilidade.
 */
export type MoneyTone = 'plain' | 'entry' | 'expense' | 'net';

interface MoneyProps {
	cents: number;
	tone?: MoneyTone;
	/** Voz do documento. Só para o total do dia e o total do período. */
	serif?: boolean;
	/** Em coluna de saldos, reserva o lugar do parêntese para as vírgulas alinharem. */
	column?: boolean;
	className?: string;
}

export function Money({ cents, tone = 'plain', serif = false, column = false, className }: MoneyProps) {
	const { negative, reais, cents: fraction } = splitCents(cents);
	const isExpense = tone === 'expense' && cents !== 0;
	const inParentheses = tone === 'net' && negative;
	const loneMinus = tone === 'plain' && negative;

	const spoken = isExpense ? `menos ${formatCents(Math.abs(cents))}` : formatCents(cents);

	return (
		<span
			className={cx(
				styles.money,
				serif && styles.serif,
				tone === 'entry' && styles.entry,
				(isExpense || inParentheses) && styles.expense,
				className,
			)}
		>
			<span className="sr-only">{spoken}</span>
			<span aria-hidden="true">
				{inParentheses && <span className={styles.soft}>(</span>}
				{(isExpense || loneMinus) && <span className={styles.sign}>−&nbsp;</span>}
				<span className={styles.currency}>R$&nbsp;</span>
				<span className={styles.reais}>{reais}</span>
				<span className={styles.soft}>,{fraction}</span>
				{inParentheses && <span className={styles.soft}>)</span>}
				{column && !inParentheses && <span className={styles.ghost}>)</span>}
			</span>
		</span>
	);
}
