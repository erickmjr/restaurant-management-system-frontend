'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useReport } from '@/lib/api/queries';
import {
	addMonths,
	capitalize,
	formatLongDate,
	formatMonthTitle,
	monthEnd,
	monthMatrix,
	monthStart,
	WEEK_HEADER,
} from '@/lib/dates';
import styles from './DayPicker.module.css';
import { ChevronLeft, ChevronRight, Trend } from './icons';

interface DayPickerProps {
	/** O dia que está aberto na página. */
	selected: string;
	today: string;
	onPick: (competence: string) => void;
}

/**
 * Procurar um dia. Um calendário pequeno, que marca os dias que têm lançamento
 * e diz se o saldo fechou para cima ou para baixo. É a versão compacta da
 * página de calendário.
 */
export function DayPicker({ selected, today, onPick }: DayPickerProps) {
	const [month, setMonth] = useState(() => monthStart(selected));
	const report = useReport(month, monthEnd(month)).data;
	const nets = new Map((report?.days ?? []).map((day) => [day.competence, day.netInCents]));
	// Mês que ainda não começou não tem o que mostrar.
	const canGoForward = addMonths(month, 1) <= today;

	return (
		<section className={styles.picker} aria-label="Procurar dia">
			<div className={styles.head}>
				<button
					type="button"
					className={styles.turn}
					onClick={() => setMonth(addMonths(month, -1))}
					aria-label="Mês anterior"
				>
					<ChevronLeft />
				</button>
				<p className={styles.month} aria-live="polite">
					{formatMonthTitle(month)}
				</p>
				<button
					type="button"
					className={styles.turn}
					onClick={() => setMonth(addMonths(month, 1))}
					disabled={!canGoForward}
					aria-label="Próximo mês"
				>
					<ChevronRight />
				</button>
			</div>

			<div className={styles.week} aria-hidden="true">
				{WEEK_HEADER.map((day) => (
					<span key={day.long} className={styles.weekday}>
						{day.short}
					</span>
				))}
			</div>

			{monthMatrix(month).map((week) => (
				<div key={week.find((day) => day !== null) ?? ''} className={styles.week}>
					{week.map((day, index) => {
						// A posição na semana é estável, então serve de chave para o buraco.
						if (day === null) return <span key={`blank-${String(index)}`} />;

						const net = nets.get(day);
						const hasData = net !== undefined;
						const title = capitalize(formatLongDate(day, today));

						return (
							<button
								key={day}
								type="button"
								className={styles.day}
								disabled={day > today}
								data-selected={day === selected}
								data-today={day === today}
								onClick={() => onPick(day)}
								aria-label={
									hasData
										? `${title}, com lançamento, saldo ${net < 0 ? 'negativo' : 'positivo'}`
										: `${title}, sem lançamento`
								}
								aria-current={day === selected ? 'date' : undefined}
							>
								{Number(day.slice(8, 10))}
								{hasData && <Trend className={styles.mark} data-negative={net < 0} up={net >= 0} />}
							</button>
						);
					})}
				</div>
			))}

			<p className={styles.foot}>
				<span className={styles.legend}>
					<Trend up /> Saldo positivo
				</span>
				<span className={styles.legend}>
					<Trend up={false} data-negative="true" /> Saldo negativo
				</span>
				<Link className={styles.more} href="/calendario">
					Ver o mês inteiro
				</Link>
			</p>
		</section>
	);
}
