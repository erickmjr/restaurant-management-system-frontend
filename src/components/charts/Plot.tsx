'use client';

import {
	type KeyboardEvent,
	type MouseEvent,
	type PointerEvent,
	type ReactNode,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from 'react';
import styles from './charts.module.css';

export interface Geometry {
	width: number;
	/** Largura de cada faixa do eixo horizontal. Uma faixa por dia, ou por dia da semana. */
	band: number;
}

interface PlotProps {
	/** O que o gráfico mostra, para leitor de tela. */
	label: string;
	height: number;
	/** Quantas faixas o eixo horizontal tem. */
	count: number;
	activeIndex: number | null;
	onActive: (index: number | null) => void;
	/** Abrir o item da faixa. Clique no mouse, Enter no teclado, segundo toque no celular. */
	onOpen?: (index: number) => void;
	/** Conteúdo da dica da faixa ativa. */
	tooltip: ReactNode;
	/** O mesmo conteúdo em texto corrido, anunciado quando a faixa ativa muda. */
	spoken: string;
	children: (geometry: Geometry) => ReactNode;
}

/**
 * A moldura comum dos gráficos. Mede a largura, acha a faixa debaixo do ponteiro
 * e posiciona a dica. O ponteiro só precisa estar na faixa certa, nunca em cima
 * de uma barra ou de uma linha de 2px.
 *
 * No teclado o gráfico é uma parada só de tabulação, e as setas percorrem as faixas.
 */
export function Plot({
	label,
	height,
	count,
	activeIndex,
	onActive,
	onOpen,
	tooltip,
	spoken,
	children,
}: PlotProps) {
	const frameRef = useRef<HTMLDivElement>(null);
	const tooltipRef = useRef<HTMLDivElement>(null);
	const [width, setWidth] = useState(0);
	const [tooltipWidth, setTooltipWidth] = useState(0);
	// No toque, o primeiro toque numa faixa mostra a dica e o segundo abre.
	const gesture = useRef<{ touch: boolean; activeBefore: number | null }>({
		touch: false,
		activeBefore: null,
	});

	useEffect(() => {
		const element = frameRef.current;

		if (element === null) return;

		const observer = new ResizeObserver(([entry]) => {
			if (entry !== undefined) setWidth(Math.floor(entry.contentRect.width));
		});

		observer.observe(element);

		return () => observer.disconnect();
	}, []);

	// A dica muda de largura conforme o conteúdo, então é medida a cada desenho.
	useLayoutEffect(() => {
		const measured = tooltipRef.current?.offsetWidth ?? 0;

		if (measured !== tooltipWidth) setTooltipWidth(measured);
	});

	const band = count > 0 ? width / count : 0;

	function indexAt(event: PointerEvent<SVGSVGElement> | MouseEvent<SVGSVGElement>): number {
		const left = event.currentTarget.getBoundingClientRect().left;

		return Math.min(count - 1, Math.max(0, Math.floor((event.clientX - left) / band)));
	}

	function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
		if (count === 0) return;

		const last = count - 1;
		let next: number | null | undefined;

		if (event.key === 'ArrowRight') next = activeIndex === null ? 0 : Math.min(last, activeIndex + 1);
		else if (event.key === 'ArrowLeft') next = activeIndex === null ? last : Math.max(0, activeIndex - 1);
		else if (event.key === 'Home') next = 0;
		else if (event.key === 'End') next = last;
		else if (event.key === 'Escape') next = null;
		else if ((event.key === 'Enter' || event.key === ' ') && activeIndex !== null && onOpen) {
			event.preventDefault();
			onOpen(activeIndex);

			return;
		}

		if (next === undefined) return;

		event.preventDefault();
		onActive(next);
	}

	const center = activeIndex === null ? 0 : (activeIndex + 0.5) * band;
	// A dica fica centrada na faixa, mas nunca passa das bordas da moldura.
	// É isso que impede ela de sair cortada na beira da tela do celular.
	const tooltipLeft = Math.max(0, Math.min(center - tooltipWidth / 2, width - tooltipWidth));

	return (
		<div
			ref={frameRef}
			className={styles.plot}
			style={{ height }}
			role="group"
			aria-label={label}
			tabIndex={0}
			onKeyDown={onKeyDown}
			onBlur={() => onActive(null)}
		>
			{width > 0 && count > 0 && (
				<svg
					className={styles.svg}
					width={width}
					height={height}
					role="presentation"
					data-clickable={onOpen !== undefined}
					onPointerDown={(event) => {
						gesture.current = { touch: event.pointerType !== 'mouse', activeBefore: activeIndex };

						if (event.pointerType !== 'mouse') onActive(indexAt(event));
					}}
					onPointerMove={(event) => onActive(indexAt(event))}
					onPointerLeave={(event) => {
						if (event.pointerType === 'mouse') onActive(null);
					}}
					onClick={(event) => {
						const index = indexAt(event);

						if (gesture.current.touch && gesture.current.activeBefore !== index) return;

						onOpen?.(index);
					}}
				>
					{children({ width, band })}
				</svg>
			)}

			{activeIndex !== null && tooltip !== null && (
				<div
					ref={tooltipRef}
					className={styles.tooltip}
					style={{ left: tooltipLeft, visibility: tooltipWidth === 0 ? 'hidden' : 'visible' }}
				>
					{tooltip}
				</div>
			)}

			<p className="sr-only" aria-live="polite">
				{spoken}
			</p>
		</div>
	);
}

interface TipRowProps {
	/** Chave de linha na cor da série. Sem chave, a linha é um total. */
	series?: 'entry' | 'expense' | 'current' | 'previous';
	value: string;
	label: string;
}

/** Linha da dica. O valor vem primeiro e forte, o nome da série depois. */
export function TipRow({ series, value, label }: TipRowProps) {
	return (
		<div className={styles.tipRow}>
			<span className={styles.key} data-series={series ?? 'none'} />
			<span className={styles.tipValue}>{value}</span>
			<span className={styles.tipLabel}>{label}</span>
		</div>
	);
}

export function TipTitle({ children }: { children: ReactNode }) {
	return <p className={styles.tipTitle}>{children}</p>;
}

export function TipNote({ children }: { children: ReactNode }) {
	return <p className={styles.tipNote}>{children}</p>;
}

interface LegendItem {
	series: 'entry' | 'expense' | 'current' | 'previous';
	label: string;
}

/** Legenda sempre presente quando há mais de uma série. Retângulo para barra, traço para linha. */
export function Legend({ items }: { items: LegendItem[] }) {
	return (
		<ul className={styles.legend}>
			{items.map((item) => (
				<li key={item.series} className={styles.legendItem}>
					<span className={styles.swatch} data-series={item.series} />
					{item.label}
				</li>
			))}
		</ul>
	);
}

/** Coluna com a ponta de dados levemente arredondada e a base reta, presa na linha de base. */
export function columnPath(x: number, width: number, base: number, tip: number): string {
	const up = tip < base;
	const radius = Math.min(2, width / 2, Math.abs(base - tip));
	const inner = tip + (up ? radius : -radius);

	return [
		`M${x},${base}`,
		`V${inner}`,
		`Q${x},${tip} ${x + radius},${tip}`,
		`H${x + width - radius}`,
		`Q${x + width},${tip} ${x + width},${inner}`,
		`V${base}`,
		'Z',
	].join(' ');
}

/** Largura aproximada de um rótulo em mono de 12px. */
const LABEL_CHAR = 7.3;

/** Rótulo centrado no ponto, a não ser que isso o faça vazar da moldura. Aí ele encosta na borda. */
export function fitLabel(
	center: number,
	text: string,
	width: number,
): { x: number; textAnchor: 'start' | 'middle' | 'end' } {
	const half = (text.length * LABEL_CHAR) / 2;

	if (center - half < 0) return { x: 0, textAnchor: 'start' };
	if (center + half > width) return { x: width, textAnchor: 'end' };

	return { x: center, textAnchor: 'middle' };
}

/** Barra fina. Nunca enche a faixa, e sempre sobra um respiro de papel entre vizinhas. */
export function barWidth(band: number): number {
	return Math.max(1, Math.min(24, band - 2));
}
