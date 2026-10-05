'use client';

import { cumulativeNet, type DayPoint, niceStep } from '@/lib/analytics';
import { capitalize, formatShortDate } from '@/lib/dates';
import { formatCents, formatCompact, formatMoney } from '@/lib/money';
import styles from './charts.module.css';
import { fitLabel, Plot, TipRow, TipTitle } from './Plot';

interface CumulativeChartProps {
	points: DayPoint[];
	/** Período de comparação, alinhado pelo número do dia dentro do período. */
	previous: DayPoint[];
	/** Nomes dos dois períodos, para a dica. */
	currentLabel?: string;
	previousLabel?: string;
	active: string | null;
	onActive: (competence: string | null) => void;
	onOpen: (competence: string) => void;
}

const HEIGHT = 220;
const TOP = 30;
const AXIS = 24;
const LABEL_GAP = 34;

function linePath(values: number[], band: number, y: (value: number) => number): string {
	return values
		.map((value, index) => `${index === 0 ? 'M' : 'L'}${((index + 0.5) * band).toFixed(1)},${y(value).toFixed(1)}`)
		.join(' ');
}

/**
 * O saldo acumulado ao longo do período, contra o período anterior.
 * Atual em tinta e anterior em cinza, que se separam por claridade e não por matiz.
 */
export function CumulativeChart({
	points,
	previous,
	currentLabel = 'Este período',
	previousLabel = 'Anterior',
	active,
	onActive,
	onOpen,
}: CumulativeChartProps) {
	const currentLine = cumulativeNet(points);
	const previousLine = cumulativeNet(previous).slice(0, points.length);
	const activeIndex = active === null ? -1 : points.findIndex((point) => point.competence === active);
	const point = activeIndex >= 0 ? points[activeIndex] : undefined;
	const currentValue = activeIndex >= 0 ? currentLine[activeIndex] : undefined;
	const previousValue = activeIndex >= 0 ? previousLine[activeIndex] : undefined;

	const all = [0, ...currentLine, ...previousLine];
	const lowest = Math.min(...all);
	const highest = Math.max(...all);
	const step = niceStep(highest - lowest, 4);
	const low = Math.floor(lowest / step) * step;
	const high = Math.max(low + step, Math.ceil(highest / step) * step);
	const plotHeight = HEIGHT - TOP - AXIS;
	const y = (value: number) => TOP + ((high - value) / (high - low)) * plotHeight;

	const ticks: number[] = [];
	for (let tick = low; tick <= high; tick += step) ticks.push(tick);

	const last = currentLine.length - 1;
	const lastValue = currentLine[last] ?? 0;

	return (
		<Plot
			label="Gráfico do saldo acumulado no período, comparado com o período anterior. Use as setas para percorrer os dias."
			height={HEIGHT}
			count={points.length}
			activeIndex={activeIndex >= 0 ? activeIndex : null}
			onActive={(index) => onActive(index === null ? null : (points[index]?.competence ?? null))}
			onOpen={(index) => {
				const target = points[index];

				if (target !== undefined) onOpen(target.competence);
			}}
			spoken={
				point === undefined || currentValue === undefined
					? ''
					: `${capitalize(formatShortDate(point.competence))}. Acumulado ${formatCents(currentValue)}.${
							previousValue === undefined ? '' : ` No período anterior, ${formatCents(previousValue)}.`
						}`
			}
			tooltip={
				point === undefined || currentValue === undefined ? null : (
					<>
						<TipTitle>Até {formatShortDate(point.competence)}</TipTitle>
						<TipRow series="current" value={formatMoney(currentValue)} label={currentLabel} />
						{previousValue !== undefined && (
							<TipRow series="previous" value={formatMoney(previousValue)} label={previousLabel} />
						)}
					</>
				)
			}
		>
			{({ width, band }) => {
				const every = Math.max(1, Math.ceil(LABEL_GAP / band));
				const endX = (last + 0.5) * band;
				const endY = y(lastValue);
				const cross = (activeIndex + 0.5) * band;

				return (
					<>
						{ticks.map((tick) => (
							<g key={tick}>
								<line
									className={tick === 0 ? styles.zero : styles.grid}
									x1={0}
									x2={width}
									y1={Math.round(y(tick)) + 0.5}
									y2={Math.round(y(tick)) + 0.5}
								/>
								{tick !== 0 && (
									<text className={styles.tick} x={0} y={y(tick) - 4}>
										{formatCompact(tick)}
									</text>
								)}
							</g>
						))}

						{activeIndex >= 0 && (
							<line
								className={styles.cross}
								x1={Math.round(cross) + 0.5}
								x2={Math.round(cross) + 0.5}
								y1={TOP}
								y2={HEIGHT - AXIS}
							/>
						)}

						{previousLine.length > 1 && (
							<path className={styles.linePrevious} d={linePath(previousLine, band, y)} />
						)}
						{currentLine.length > 1 && <path className={styles.line} d={linePath(currentLine, band, y)} />}

						{/* Rótulo direto só na ponta. O resto fica com o eixo e com a dica. */}
						{last >= 0 && (
							<>
								<circle className={styles.dot} cx={endX} cy={endY} r={4} />
								<text
									className={styles.valueLabel}
									y={endY - 10 < 12 ? endY + 20 : endY - 10}
									{...fitLabel(endX, formatCompact(lastValue), width)}
								>
									{formatCompact(lastValue)}
								</text>
							</>
						)}

						{activeIndex >= 0 && previousValue !== undefined && (
							<circle className={styles.dotPrevious} cx={cross} cy={y(previousValue)} r={4} />
						)}
						{activeIndex >= 0 && currentValue !== undefined && (
							<circle className={styles.dot} cx={cross} cy={y(currentValue)} r={4} />
						)}

						{points.map((item, index) => {
							if (index % every !== 0) return null;

							const text = item.competence.slice(8, 10);

							return (
								<text
									key={item.competence}
									className={styles.tick}
									y={HEIGHT - 6}
									{...fitLabel((index + 0.5) * band, text, width)}
								>
									{text}
								</text>
							);
						})}
					</>
				);
			}}
		</Plot>
	);
}
