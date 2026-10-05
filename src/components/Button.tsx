import type { ButtonHTMLAttributes } from 'react';
import { cx } from '@/lib/cx';
import styles from './Button.module.css';

type Variant = 'solid' | 'outline';
type Size = 'regular' | 'small';

/** Classe pronta para um Link que precisa parecer botão. */
export function buttonClass(variant: Variant = 'solid', size: Size = 'regular', extra?: string) {
	return cx(styles.button, styles[variant], size === 'small' && styles.small, extra);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: Variant;
	size?: Size;
}

/** Tinta sobre papel, retangular, sem sombra. A autoridade vem do contraste. */
export function Button({
	variant = 'solid',
	size = 'regular',
	type = 'button',
	className,
	...rest
}: ButtonProps) {
	return <button type={type} className={buttonClass(variant, size, className)} {...rest} />;
}
