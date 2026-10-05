import styles from './Stamp.module.css';

/**
 * Carimbo da página travada. Só contorno, torto uns seis graus,
 * por cima do canto do bloco de totais. A página virou documento histórico.
 */
export function Stamp({ date }: { date: string }) {
	return (
		<svg
			className={styles.stamp}
			width="164"
			height="68"
			viewBox="0 0 164 68"
			role="img"
			aria-label={`Página fechada em ${date}`}
		>
			<rect x="1.5" y="1.5" width="161" height="65" fill="none" stroke="currentColor" strokeWidth="3" />
			<rect x="7.5" y="7.5" width="149" height="53" fill="none" stroke="currentColor" strokeWidth="1" />
			<text x="84" y="35" textAnchor="middle" className={styles.word}>
				FECHADO
			</text>
			<text x="82" y="52" textAnchor="middle" className={styles.date}>
				{date}
			</text>
		</svg>
	);
}
