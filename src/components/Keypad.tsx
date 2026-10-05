import { cx } from '@/lib/cx';
import { Erase } from './icons';
import styles from './Keypad.module.css';

interface KeypadProps {
	onDigit: (digit: number) => void;
	onErase: () => void;
	onConfirm: () => void;
	confirmLabel: string;
	/** Falta valor ou falta escolha. A tecla continua tocável, para dizer o que falta. */
	ready: boolean;
	busy: boolean;
}

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * Teclado de máquina registradora. Nove teclas, zero e apagar, sem vírgula.
 * O zero é largo porque é a tecla mais batida quando o assunto é dinheiro,
 * e confirmar é a tecla alta do canto, ao alcance do polegar.
 */
export function Keypad({ onDigit, onErase, onConfirm, confirmLabel, ready, busy }: KeypadProps) {
	return (
		<fieldset className={styles.pad} disabled={busy}>
			<legend className="sr-only">Teclado numérico</legend>

			{DIGITS.slice(0, 3).map((digit) => (
				<Key key={digit} digit={digit} onDigit={onDigit} />
			))}

			<button type="button" className={cx(styles.key, styles.erase)} onClick={onErase}>
				<span className={styles.cap}>
					<Erase />
					<span className="sr-only">Apagar último dígito</span>
				</span>
			</button>

			{DIGITS.slice(3).map((digit) => (
				<Key key={digit} digit={digit} onDigit={onDigit} />
			))}

			<button type="button" className={cx(styles.key, styles.zero)} onClick={() => onDigit(0)}>
				<span className={styles.cap}>0</span>
			</button>

			<button
				type="button"
				className={cx(styles.key, styles.confirm, !ready && styles.waiting)}
				onClick={onConfirm}
			>
				<span className={styles.cap}>{confirmLabel}</span>
			</button>
		</fieldset>
	);
}

function Key({ digit, onDigit }: { digit: number; onDigit: (digit: number) => void }) {
	return (
		<button type="button" className={styles.key} onClick={() => onDigit(digit)}>
			<span className={styles.cap}>{digit}</span>
		</button>
	);
}
