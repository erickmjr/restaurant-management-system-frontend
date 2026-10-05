'use client';

import { type DayPoint, niceStep } from '@/lib/analytics';
import { capitalize, formatShortDate } from '@/lib/dates';
import { formatCents, formatCompact, formatMoney } from '@/lib/money';
import styles from './charts.module.css';
import { barWidth, columnPath, fitLabel, Plot, TipNote, TipRow, TipTitle } from './Plot';

interface FlowChartProps {
	points: DayPoint[];
	active: string | null;
	onActive: (competence: string | null) => void;
	onOpen: (competence: string) => void;
}

const HEIGHT = 240;
const TOP = 18;
const AXIS = 24;
/** Distância mínima entre rótulos do eixo dos dias, em px. */
const LABEL_GAP = 34;

/**
 * Entrou e saiu, dia a dia. Entrada sobe da linha de base e saída desce,
 * as duas na mesma escala. A direção é que identifica a série, e a cor só reforça.
 */
export function FlowChart({ points, active, onActive, onOpen }: FlowChartProps) {
	const activeIndex = active === null ? -1 : points.findIndex((point) => point.competence === active);
	const current = activeIndex >= 0 ? points[activeIndex] : undefined;

	const maxUp = Math.max(0, ...points.map((point) => point.entries));
	const maxDown = Math.max(0, ...points.map((point) => point.expenses));
	// Um eixo só. O mesmo passo vale para cima e para baixo.
	const step = niceStep(Math.max(maxUp, maxDown));
	const upTicks = Math.max(1, Math.ceil(maxUp / step));
	const downTicks = Math.ceil(maxDown / step);
	const top = upTicks * step;
	const bottom = downTicks * step;
	const plotHeight = HEIGHT - TOP - AXIS;
	const y = (value: number) => TOP + ((top - value) / (top + bottom)) * plotHeight;
	const base = y(0);

	const ticks: number[] = [];
	for (let tick = -downTicks; tick <= upTicks; tick += 1) ticks.push(tick * step);

	const spansMonths =
		points.length > 0 && points[0]?.competence.slice(0, 7) !== points.at(-1)?.competence.slice(0, 7);

	return (
		<Plot
			label="Gráfico de entradas e saídas por dia. Use as setas para percorrer os dias e Enter para abrir a página do dia."
			height={HEIGHT}
			count={points.length}
			activeIndex={activeIndex >= 0 ? activeIndex : null}
			onActive={(index) => onActive(index === null ? null : (points[index]?.competence ?? null))}
			onOpen={(index) => {
				const point = points[index];

				if (point !== undefined) onOpen(point.competence);
			}}
			spoken={
				current === undefined
					? ''
					: current.hasData
						? `${capitalize(formatShortDate(current.competence))}. Entrou ${formatCents(current.entries)}, saiu ${formatCents(current.expenses)}, saldo ${formatCents(current.net)}.`
						: `${capitalize(formatShortDate(current.competence))}. Sem lançamentos.`
			}
			tooltip={
				current === undefined ? null : (
					<>
						<TipTitle>{capitalize(formatShortDate(current.competence))}</TipTitle>
						{current.hasData ? (
							<>
								<TipRow series="entry" value={formatMoney(current.entries)} label="Entrou" />
								<TipRow series="expense" value={formatMoney(current.expenses)} label="Saiu" />
								<TipRow value={formatMoney(current.net)} label="Saldo" />
							</>
						) : (
							<TipNote>Sem lançamentos</TipNote>
						)}
					</>
				)
			}
		>
			{({ width, band }) => {
				const bar = barWidth(band);
				const every = Math.max(1, Math.ceil(LABEL_GAP / band));

				return (
					<>
						{activeIndex >= 0 && (
							<rect className={styles.band} x={activeIndex * band} y={TOP} width={band} height={plotHeight} />
						)}

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
										{formatCompact(Math.abs(tick))}
									</text>
								)}
							</g>
						))}

						{points.map((point, index) => {
							const x = index * band + (band - bar) / 2;

							return (
								<g key={point.competence}>
									{point.entries > 0 && (
										<path
											className={styles.entry}
											d={columnPath(x, bar, base, Math.min(base - 1, y(point.entries)))}
										/>
									)}
									{point.expenses > 0 && (
										<path
											className={styles.expense}
											d={columnPath(x, bar, base, Math.max(base + 1, y(-point.expenses)))}
										/>
									)}
								</g>
							);
						})}

						{points.map((point, index) => {
							if (index % every !== 0) return null;

							const day = point.competence.slice(8, 10);
							// Quando o período cruza meses, o primeiro rótulo de cada mês leva o mês junto.
							const monthTurn = spansMonths && (index === 0 || Number(day) <= every);
							const text = monthTurn ? `${day}/${point.competence.slice(5, 7)}` : day;

							return (
								<text
									key={point.competence}
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
