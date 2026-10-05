// Dinheiro trafega sempre como inteiro em centavos. Aqui é só exibição.

export interface MoneyParts {
	negative: boolean;
	reais: string;
	cents: string;
}

export function splitCents(amountInCents: number): MoneyParts {
	const absolute = Math.abs(Math.trunc(amountInCents));
	const reais = Math.floor(absolute / 100);
	const cents = absolute % 100;

	return {
		negative: amountInCents < 0,
		reais: String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, '.'),
		cents: String(cents).padStart(2, '0'),
	};
}

/** Texto corrido, para leitor de tela e mensagens. `R$ 1.250,00`. */
export function formatCents(amountInCents: number): string {
	const { negative, reais, cents } = splitCents(amountInCents);

	return `${negative ? 'menos ' : ''}R$ ${reais},${cents}`;
}

/** Limite do display da máquina, nove dígitos, R$ 9.999.999,99. */
export const MAX_AMOUNT_IN_CENTS = 999_999_999;

/** Dígito entra pela direita, como em máquina registradora. */
export function pushDigit(amountInCents: number, digit: number): number {
	const next = amountInCents * 10 + digit;

	return next > MAX_AMOUNT_IN_CENTS ? amountInCents : next;
}

export function popDigit(amountInCents: number): number {
	return Math.floor(amountInCents / 10);
}

function trimmed(value: number): string {
	return (Math.round(value * 10) / 10).toString().replace('.', ',');
}

/** "R$ 5 mil", "R$ 1,2 mi". Só para eixo e rótulo de gráfico, nunca para valor de lançamento. */
export function formatCompact(amountInCents: number): string {
	const reais = Math.abs(amountInCents) / 100;
	const sign = amountInCents < 0 ? '− ' : '';

	if (reais >= 1_000_000) return `${sign}R$ ${trimmed(reais / 1_000_000)} mi`;
	if (reais >= 1000) return `${sign}R$ ${trimmed(reais / 1000)} mil`;

	return `${sign}R$ ${Math.round(reais)}`;
}

/** "+12%", "−8%". Sinal sempre visível, para a direção não depender de cor. */
export function formatPercentChange(change: number): string {
	const percent = Math.round(Math.abs(change) * 100);

	if (percent === 0) return '0%';

	return `${change > 0 ? '+' : '−'}${percent}%`;
}

/** O valor por extenso para ler com os olhos, "R$ 1.250,00". Negativo vem entre parênteses, como em contabilidade. */
export function formatMoney(amountInCents: number): string {
	const { negative, reais, cents } = splitCents(amountInCents);
	const text = `R$ ${reais},${cents}`;

	return negative ? `(${text})` : text;
}

/** "9,2 mil", "568", "139 mil". Sem R$, para caber no bloco de dia do calendário no celular. */
export function formatTiny(amountInCents: number): string {
	const reais = Math.abs(amountInCents) / 100;

	// Espaço fino, que não quebra linha. Economiza os pixels que faltam num celular estreito.
	const gap = '\u202f';

	if (reais >= 1_000_000) return `${trimmed(reais / 1_000_000)}${gap}mi`;
	if (reais >= 100_000) return `${Math.round(reais / 1000)}${gap}mil`;
	if (reais >= 1000) return `${trimmed(reais / 1000)}${gap}mil`;

	return String(Math.round(reais));
}

/** Diferença entre dois valores, com o sinal sempre à vista. "+ R$ 5.449,40", "− R$ 1.200,00". */
export function formatSigned(amountInCents: number): string {
	const { reais, cents } = splitCents(amountInCents);
	const sign = amountInCents > 0 ? '+ ' : amountInCents < 0 ? '− ' : '';

	return `${sign}R$ ${reais},${cents}`;
}
