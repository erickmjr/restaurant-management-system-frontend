// Competência é só dia, mês e ano, no formato AAAA-MM-DD.
// "Hoje" segue a mesma conta do servidor, UTC menos três.

const BRASILIA_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'] as const;
const WEEKDAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const;
const MONTHS = [
	'janeiro',
	'fevereiro',
	'março',
	'abril',
	'maio',
	'junho',
	'julho',
	'agosto',
	'setembro',
	'outubro',
	'novembro',
	'dezembro',
] as const;
const MONTHS_SHORT = [
	'jan',
	'fev',
	'mar',
	'abr',
	'mai',
	'jun',
	'jul',
	'ago',
	'set',
	'out',
	'nov',
	'dez',
] as const;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function toUtcDate(competence: string): Date {
	const [year = 0, month = 1, day = 1] = competence.split('-').map(Number);

	return new Date(Date.UTC(year, month - 1, day));
}

function toCompetence(date: Date): string {
	return date.toISOString().slice(0, 10);
}

export function todayCompetence(now: number = Date.now()): string {
	return toCompetence(new Date(now - BRASILIA_OFFSET_MS));
}

export function isValidCompetence(value: string): boolean {
	if (!ISO_DATE.test(value)) return false;

	const date = toUtcDate(value);

	return !Number.isNaN(date.getTime()) && toCompetence(date) === value;
}

export function addDays(competence: string, days: number): string {
	return toCompetence(new Date(toUtcDate(competence).getTime() + days * DAY_MS));
}

/** Quantos dias o intervalo cobre, contando os dois extremos. */
export function daysBetween(from: string, to: string): number {
	return Math.max(0, Math.round((toUtcDate(to).getTime() - toUtcDate(from).getTime()) / DAY_MS) + 1);
}

/** 0 é domingo. */
export function weekdayOf(competence: string): number {
	return toUtcDate(competence).getUTCDay();
}

/** "sáb, 26 de set". Cabe numa dica de gráfico. */
export function formatShortDate(competence: string): string {
	const date = toUtcDate(competence);

	return `${WEEKDAYS_SHORT[date.getUTCDay()]}, ${date.getUTCDate()} de ${MONTHS_SHORT[date.getUTCMonth()]}`;
}

/** Texto de tela começa com maiúscula. No meio de uma frase, o nome do dia segue minúsculo. */
export function capitalize(text: string): string {
	return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Primeiro dia do mês que fica `months` meses depois, ou antes se for negativo. */
export function addMonths(competence: string, months: number): string {
	const date = toUtcDate(competence);

	return toCompetence(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1)));
}

/** Quantos meses vão do mês de `from` até o mês de `to`. Negativo quando `to` vem antes. */
export function monthsBetween(from: string, to: string): number {
	const start = toUtcDate(from);
	const end = toUtcDate(to);

	return (
		(end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth())
	);
}

/**
 * O mesmo dia, `months` meses depois. Dia 31 num mês de 30 vira dia 30.
 * Com `toMonthEnd`, cai sempre no último dia do mês de destino, para
 * "agosto inteiro" virar "fevereiro inteiro" e não "fevereiro até o dia 28 de um mês de 29".
 */
export function shiftMonths(competence: string, months: number, toMonthEnd = false): string {
	const target = addMonths(competence, months);
	const last = monthEnd(target);

	if (toMonthEnd) return last;

	const day = Math.min(Number(competence.slice(8, 10)), Number(last.slice(8, 10)));

	return `${target.slice(0, 8)}${String(day).padStart(2, '0')}`;
}

/** Os doze meses, para o seletor de mês. */
export const MONTH_LABELS = [
	{ short: 'Jan', long: 'Janeiro' },
	{ short: 'Fev', long: 'Fevereiro' },
	{ short: 'Mar', long: 'Março' },
	{ short: 'Abr', long: 'Abril' },
	{ short: 'Mai', long: 'Maio' },
	{ short: 'Jun', long: 'Junho' },
	{ short: 'Jul', long: 'Julho' },
	{ short: 'Ago', long: 'Agosto' },
	{ short: 'Set', long: 'Setembro' },
	{ short: 'Out', long: 'Outubro' },
	{ short: 'Nov', long: 'Novembro' },
	{ short: 'Dez', long: 'Dezembro' },
] as const;

/** "Setembro de 2026". */
export function formatMonthTitle(competence: string): string {
	const date = toUtcDate(competence);

	return capitalize(`${MONTHS[date.getUTCMonth()]} de ${date.getUTCFullYear()}`);
}

/** O cabeçalho do calendário, começando no domingo, como nos calendários daqui. */
export const WEEK_HEADER = [
	{ short: 'D', medium: 'Dom', long: 'Domingo' },
	{ short: 'S', medium: 'Seg', long: 'Segunda' },
	{ short: 'T', medium: 'Ter', long: 'Terça' },
	{ short: 'Q', medium: 'Qua', long: 'Quarta' },
	{ short: 'Q', medium: 'Qui', long: 'Quinta' },
	{ short: 'S', medium: 'Sex', long: 'Sexta' },
	{ short: 'S', medium: 'Sáb', long: 'Sábado' },
] as const;

/**
 * O mês em semanas, de domingo a sábado. Os dias de fora do mês vêm como null,
 * para a grade ficar com os buracos no lugar certo.
 */
export function monthMatrix(competence: string): Array<Array<string | null>> {
	const first = monthStart(competence);
	const total = Number(monthEnd(first).slice(8, 10));
	const cells: Array<string | null> = Array.from({ length: weekdayOf(first) }, () => null);

	for (let day = 0; day < total; day += 1) cells.push(addDays(first, day));
	while (cells.length % 7 !== 0) cells.push(null);

	const weeks: Array<Array<string | null>> = [];
	for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7));

	return weeks;
}

export function monthStart(competence: string): string {
	return `${competence.slice(0, 7)}-01`;
}

export function monthEnd(competence: string): string {
	const date = toUtcDate(competence);

	return toCompetence(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)));
}

export function previousMonthStart(competence: string): string {
	const date = toUtcDate(competence);

	return toCompetence(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1)));
}

/** "terça, 10 de março". O ano só aparece quando não é o ano corrente. */
export function formatLongDate(competence: string, today: string = todayCompetence()): string {
	const date = toUtcDate(competence);
	const weekday = WEEKDAYS[date.getUTCDay()];
	const month = MONTHS[date.getUTCMonth()];
	const base = `${weekday}, ${date.getUTCDate()} de ${month}`;

	return competence.slice(0, 4) === today.slice(0, 4) ? base : `${base} de ${date.getUTCFullYear()}`;
}

export function dayAndWeekday(competence: string): { day: string; weekday: string } {
	const date = toUtcDate(competence);

	return {
		day: competence.slice(8, 10),
		weekday: capitalize(WEEKDAYS_SHORT[date.getUTCDay()] ?? ''),
	};
}

/** Título do livro. Mês cheio vira "março de 2026", o resto vira intervalo curto. */
export function formatPeriodTitle(from: string, to: string): string {
	const start = toUtcDate(from);
	const end = toUtcDate(to);

	if (from === monthStart(from) && to === monthEnd(from)) {
		return `${MONTHS[start.getUTCMonth()]} de ${start.getUTCFullYear()}`;
	}

	const short = (date: Date, withYear: boolean): string =>
		`${date.getUTCDate()} de ${MONTHS_SHORT[date.getUTCMonth()]}${withYear ? ` de ${date.getUTCFullYear()}` : ''}`;

	if (from === to) return short(start, true);

	// Dentro do mesmo mês o nome do mês aparece uma vez só. "1 a 15 de setembro de 2026".
	if (from.slice(0, 7) === to.slice(0, 7)) {
		return `${start.getUTCDate()} a ${end.getUTCDate()} de ${MONTHS[start.getUTCMonth()]} de ${start.getUTCFullYear()}`;
	}

	const sameYear = start.getUTCFullYear() === end.getUTCFullYear();

	return `${short(start, !sameYear)} a ${short(end, true)}`;
}

/** Instante ISO em UTC para data de Brasília, "13/03/2026". */
export function formatInstantDate(instant: string): string {
	const local = new Date(Date.parse(instant) - BRASILIA_OFFSET_MS);
	const day = String(local.getUTCDate()).padStart(2, '0');
	const month = String(local.getUTCMonth() + 1).padStart(2, '0');

	return `${day}/${month}/${local.getUTCFullYear()}`;
}

/** Instante ISO em UTC para hora de Brasília, "21:42". */
export function formatInstantTime(instant: string): string {
	const local = new Date(Date.parse(instant) - BRASILIA_OFFSET_MS);
	const hours = String(local.getUTCHours()).padStart(2, '0');
	const minutes = String(local.getUTCMinutes()).padStart(2, '0');

	return `${hours}:${minutes}`;
}

function count(amount: number, one: string, many: string): string {
	return `${amount} ${amount === 1 ? one : many}`;
}

/** "2 dias e 4 horas". Devolve null quando a janela já fechou. */
export function describeTimeLeft(lockedAt: string, now: number): string | null {
	const remaining = Date.parse(lockedAt) - now;

	if (!(remaining > 0)) return null;

	const totalMinutes = Math.floor(remaining / 60_000);

	if (totalMinutes < 1) return 'menos de um minuto';

	const days = Math.floor(totalMinutes / 1440);
	const hours = Math.floor((totalMinutes % 1440) / 60);
	const minutes = totalMinutes % 60;

	if (days > 0) {
		const daysText = count(days, 'dia', 'dias');

		return hours > 0 ? `${daysText} e ${count(hours, 'hora', 'horas')}` : daysText;
	}

	if (hours > 0) {
		const hoursText = count(hours, 'hora', 'horas');

		return minutes > 0 ? `${hoursText} e ${count(minutes, 'minuto', 'minutos')}` : hoursText;
	}

	return count(minutes, 'minuto', 'minutos');
}

/** Caminho da página de um dia. Hoje mora na raiz. */
export function dayHref(competence: string, today: string = todayCompetence()): string {
	return competence === today ? '/' : `/dia/${competence}`;
}
