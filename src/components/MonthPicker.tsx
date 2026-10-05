'use client';

import { useState } from 'react';
import { MONTH_LABELS } from '@/lib/dates';
import { ChevronLeft, ChevronRight } from './icons';
import styles from './MonthPicker.module.css';

interface MonthPickerProps {
	/** O que este seletor escolhe, para leitor de tela. */
	label: string;
	/** Mês marcado, como primeiro dia do mês. */
	value: string | null;
	today: string;
	/** Mês que não pode ser escolhido. Na comparação, é o próprio mês do período. */
	blocked?: string | null;
	onPick: (month: string) => void;
}

/**
 * Escolher um mês e um ano. O ano anda pelas setas e os doze meses ficam à vista,
 * então agosto de 2021 está a dois toques, sem digitar data.
 */
export function MonthPicker({ label, value, today, blocked = null, onPick }: MonthPickerProps) {
	const currentYear = Number(today.slice(0, 4));
	const [year, setYear] = useState(() => Number((value ?? today).slice(0, 4)));

	return (
		<section className={styles.picker} aria-label={label}>
			<div className={styles.head}>
				<button
					type="button"
					className={styles.turn}
					onClick={() => setYear((current) => current - 1)}
					aria-label="Voltar um ano"
				>
					<ChevronLeft />
				</button>
				<p className={styles.year} aria-live="polite">
					{year}
				</p>
				<button
					type="button"
					className={styles.turn}
					onClick={() => setYear((current) => current + 1)}
					disabled={year >= currentYear}
					aria-label="Avançar um ano"
				>
					<ChevronRight />
				</button>
			</div>

			<div className={styles.months}>
				{MONTH_LABELS.map((month, index) => {
					const competence = `${String(year)}-${String(index + 1).padStart(2, '0')}-01`;

					return (
						<button
							key={month.long}
							type="button"
							className={styles.month}
							// Mês que ainda não começou não tem o que mostrar.
							disabled={competence > today || competence === blocked}
							data-selected={competence === value}
							aria-pressed={competence === value}
							aria-label={`${month.long} de ${String(year)}`}
							onClick={() => onPick(competence)}
						>
							{month.short}
						</button>
					);
				})}
			</div>
		</section>
	);
}
