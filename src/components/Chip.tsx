import type { ButtonHTMLAttributes } from 'react';
import { cx } from '@/lib/cx';
import styles from './Chip.module.css';

interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'role' | 'type'> {
	selected: boolean;
	/** radio, escolha única dentro do grupo. checkbox, marca e desmarca, e várias podem ficar marcadas. */
	kind?: 'radio' | 'checkbox';
}

/**
 * Pastilha de escolha. Faz o papel que em outro app seria de um select,
 * com todas as opções a um toque. Selecionada fica tinta cheia.
 */
export function Chip({ selected, kind = 'radio', className, ...rest }: ChipProps) {
	return (
		<button
			type="button"
			role={kind}
			aria-checked={selected}
			className={cx(styles.chip, selected && styles.selected, className)}
			{...rest}
		/>
	);
}

export const chipRowClass = styles.row;
export const chipPairClass = styles.pair;
