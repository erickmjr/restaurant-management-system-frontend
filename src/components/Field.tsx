import { type InputHTMLAttributes, useId } from 'react';
import { cx } from '@/lib/cx';
import styles from './Field.module.css';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
	label: string;
	/** Erro mora debaixo do campo, nunca em toast. */
	error?: string | null;
	hint?: string;
	mono?: boolean;
}

export function Field({ label, error, hint, mono = false, className, id, ...rest }: FieldProps) {
	const generatedId = useId();
	const inputId = id ?? generatedId;
	const messageId = `${inputId}-message`;
	const hasError = error !== undefined && error !== null && error !== '';
	const hasMessage = hasError || hint !== undefined;

	return (
		<div className={cx(styles.field, className)}>
			<label className="label" htmlFor={inputId}>
				{label}
			</label>
			<input
				id={inputId}
				className={cx(styles.input, mono && styles.mono, hasError && styles.invalid)}
				aria-invalid={hasError || undefined}
				aria-describedby={hasMessage ? messageId : undefined}
				{...rest}
			/>
			{hasError ? (
				<p id={messageId} className="error" role="alert">
					{error}
				</p>
			) : (
				hint !== undefined && (
					<p id={messageId} className={styles.hint}>
						{hint}
					</p>
				)
			)}
		</div>
	);
}

export const inputClass = styles.input;
