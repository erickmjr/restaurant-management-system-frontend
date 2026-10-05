import { cx } from '@/lib/cx';
import { formatPercentChange } from '@/lib/money';
import styles from './Delta.module.css';
import { Trend } from './icons';

interface DeltaProps {
	/** Variação relativa. Null quando o período de comparação não tem com o que comparar. */
	change: number | null;
	/** Em entrada, subir é bom. Em saída, subir é ruim. */
	goodWhenUp?: boolean;
	/** O que mostrar quando não há comparação possível. */
	empty?: string;
}

/** Variação entre dois períodos. O sinal e a seta dizem a direção, e a cor só diz se foi bom ou ruim. */
export function Delta({ change, goodWhenUp = true, empty = 'Sem dados para comparar' }: DeltaProps) {
	if (change === null) return <span className={styles.none}>{empty}</span>;

	const flat = Math.round(Math.abs(change) * 100) === 0;
	const up = change > 0;
	const good = up === goodWhenUp;

	return (
		<span className={cx(styles.delta, !flat && (good ? styles.good : styles.bad))}>
			{!flat && <Trend up={up} />}
			{formatPercentChange(change)}
			<span className="sr-only"> em relação ao período de comparação</span>
		</span>
	);
}
