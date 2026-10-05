import type { ReactNode, SVGProps } from 'react';

// Os ícones do app, desenhados à mão num só traço. 1.5 de espessura, cantos retos,
// sem pacote. Entram onde ajudam a achar a coisa, que é na navegação e nas ações.
// Todo ícone acompanha um texto, ou tem um nome para leitor de tela em quem o usa.

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...rest }: IconProps & { children: ReactNode }) {
	return (
		<svg
			width="20"
			height="20"
			viewBox="0 0 20 20"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="square"
			aria-hidden="true"
			focusable="false"
			{...rest}
		>
			{children}
		</svg>
	);
}

export function ChevronLeft(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M12.5 4 6.5 10l6 6" />
		</Icon>
	);
}

export function ChevronRight(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="m7.5 4 6 6-6 6" />
		</Icon>
	);
}

/** A página do dia. Uma folha pautada. */
export function PageIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M4.5 2.5h11v15h-11z" />
			<path d="M7.5 7h5M7.5 10h5M7.5 13h3" />
		</Icon>
	);
}

export function CalendarIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M3 4.5h14v12.5H3zM3 8.5h14M7 2.5v4M13 2.5v4" />
		</Icon>
	);
}

/** O painel. Colunas sobre uma linha de base. */
export function ChartIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M2.5 17.5h15M5.5 17V11M10 17V5M14.5 17V8.5" />
		</Icon>
	);
}

/** Os catálogos. Uma lista com marcadores. */
export function ListIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M7.5 5h9.5M7.5 10h9.5M7.5 15h9.5M3 5h1M3 10h1M3 15h1" />
		</Icon>
	);
}

export function PersonPlusIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M5 6.5h5v-4H5zM2.5 17.5v-6h10v6M15.5 6v6M12.5 9h6" />
		</Icon>
	);
}

export function LogOutIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M8 3H3.5v14H8M8 10h9M13.5 6l4 4-4 4" />
		</Icon>
	);
}

/** Dinheiro que entra. O mesmo sinal de mais que a conta usaria. */
export function PlusCircle(props: IconProps) {
	return (
		<Icon {...props}>
			<circle cx="10" cy="10" r="7.25" />
			<path d="M10 6.5v7M6.5 10h7" />
		</Icon>
	);
}

/** Dinheiro que sai. O mesmo sinal de menos que acompanha toda saída no livro. */
export function MinusCircle(props: IconProps) {
	return (
		<Icon {...props}>
			<circle cx="10" cy="10" r="7.25" />
			<path d="M6.5 10h7" />
		</Icon>
	);
}

export function PencilIcon(props: IconProps) {
	return (
		<Icon width="16" height="16" {...props}>
			<path d="M3 17h3.5L17 6.5 13.5 3 3 13.5zM11.5 5l3.5 3.5" />
		</Icon>
	);
}

export function TrashIcon(props: IconProps) {
	return (
		<Icon width="16" height="16" {...props}>
			<path d="M3 5.5h14M7.5 5.5v-3h5v3M5 5.5l1 12h8l1-12M8.5 9v5M11.5 9v5" />
		</Icon>
	);
}

export function LockIcon(props: IconProps) {
	return (
		<Icon width="16" height="16" {...props}>
			<path d="M4.5 9h11v8.5h-11zM7 9V6a3 3 0 0 1 6 0v3" />
		</Icon>
	);
}

export function CopyIcon(props: IconProps) {
	return (
		<Icon width="16" height="16" {...props}>
			<path d="M7 7h10.5v10.5H7zM13 7V2.5H2.5V13H7" />
		</Icon>
	);
}

export function Erase(props: IconProps) {
	return (
		<Icon width="28" height="28" viewBox="0 0 28 28" {...props}>
			<path d="M10 6h15v16H10L3 14z" />
			<path d="m14 10.5 7 7m0-7-7 7" />
		</Icon>
	);
}

export function Cross(props: IconProps) {
	return (
		<Icon width="12" height="12" viewBox="0 0 12 12" {...props}>
			<path d="m2.5 2.5 7 7m0-7-7 7" />
		</Icon>
	);
}

export function Plus(props: IconProps) {
	return (
		<Icon width="12" height="12" viewBox="0 0 12 12" {...props}>
			<path d="M6 1.5v9M1.5 6h9" />
		</Icon>
	);
}

/** Saldo do dia. Para cima é positivo e para baixo é negativo, e a forma diz isso sem depender da cor. */
export function Trend({ up, ...rest }: IconProps & { up: boolean }) {
	return (
		<svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true" focusable="false" {...rest}>
			<path d={up ? 'M4 1 7.5 7h-7z' : 'M4 7 .5 1h7z'} fill="currentColor" />
		</svg>
	);
}
