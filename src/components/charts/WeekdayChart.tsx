'use client';

import { useState } from 'react';
import { niceStep, type WeekdayAverage } from '@/lib/analytics';
import { formatCents, formatCompact, formatMoney } from '@/lib/money';
import styles from './charts.module.css';
import { barWidth, columnPath, fitLabel, Plot, TipNote, TipRow, TipTitle } from './Plot';

const HEIGHT = 200;
const TOP = 24;
const AXIS = 24;

/**
 * Quanto entra, em média, em cada dia da semana. Uma série só, então uma cor só
 * e nenhuma legenda. O título já diz o que está no gráfico.
 */
export function WeekdayChart({ rows }: { rows: WeekdayAverage[] }) {
	const [activeIndex, setActiveIndex] = useState<number | null>(null);
	const current = activeIndex === null ? undefined : rows[activeIndex];

	const highest = Math.max(0, ...rows.map((row) => row.average));
	const step = niceStep(highest);
	const top = Math.max(1, Math.ceil(highest / step)) * step;
	const plotHeight = HEIGHT - TOP - AXIS;
	const y = (value: number) => TOP + ((top - value) / top) * plotHeight;
	const base = y(0);
	const peak = rows.findIndex((row) => row.average === highest && highest > 0);

	const ticks: number[] = [];
	for (let tick = 0; tick <= top; tick += step) ticks.push(tick);

	return (
		<>
			<Plot
				label="Gráfico da média de entradas por dia da semana. Use as setas para percorrer os dias."
				height={HEIGHT}
				count={rows.length}
				activeIndex={activeIndex}
				onActive={setActiveIndex}
				spoken={
					current === undefined
						? ''
						: current.days === 0
							? `${current.plural}. Sem lançamento no período.`
							: `${current.plural}. Média de ${formatCents(current.average)} em ${current.days} dias.`
				}
				tooltip={
					current === undefined ? null : (
						<>
							<TipTitle>{current.plural}</TipTitle>
							{current.days === 0 ? (
								<TipNote>Sem lançamento no período</TipNote>
							) : (
								<>
									<TipRow series="entry" value={formatMoney(current.average)} label="Média" />
									<TipNote>
										{current.days} {current.days === 1 ? 'dia' : 'dias'} no período
									</TipNote>
								</>
							)}
						</>
					)
				}
			>
				{({ width, band }) => {
					const bar = barWidth(band);

					return (
						<>
							{activeIndex !== null && (
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
											{formatCompact(tick)}
										</text>
									)}
								</g>
							))}

							{rows.map((row, index) => {
								const x = index * band + (band - bar) / 2;
								const center = (index + 0.5) * band;

								return (
									<g key={row.weekday}>
										{row.average > 0 && (
											<path
												className={styles.entry}
												d={columnPath(x, bar, base, Math.min(base - 1, y(row.average)))}
											/>
										)}
										{/* Rótulo direto só no dia mais forte. */}
										{index === peak && (
											<text
												className={styles.valueLabel}
												y={y(row.average) - 6}
												{...fitLabel(center, formatCompact(row.average), width)}
											>
												{formatCompact(row.average)}
											</text>
										)}
										<text className={styles.tick} x={center} y={HEIGHT - 6} textAnchor="middle">
											{row.label}
										</text>
									</g>
								);
							})}
						</>
					);
				}}
			</Plot>

			{/* A mesma informação em tabela, para quem não vê o gráfico. */}
			<div className="sr-only">
			<table>
				<caption>Média de entradas por dia da semana</caption>
				<thead>
					<tr>
						<th scope="col">Dia da semana</th>
						<th scope="col">Média de entradas</th>
						<th scope="col">Dias no período</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((row) => (
						<tr key={row.weekday}>
							<th scope="row">{row.plural}</th>
							<td>{row.days === 0 ? 'Sem lançamento' : formatCents(row.average)}</td>
							<td>{row.days}</td>
						</tr>
					))}
				</tbody>
			</table>
			</div>
		</>
	);
}
