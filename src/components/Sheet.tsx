import type { ReactNode } from 'react';
import styles from './Sheet.module.css';

/**
 * A régua vertical da esquerda da página.
 * open, ocre, a janela de três dias está correndo.
 * locked, cinza de travado, a página fechou.
 * plain, régua comum, página em branco ou tela sem janela.
 */
export type SheetMargin = 'open' | 'locked' | 'plain';

interface SheetProps {
	margin?: SheetMargin;
	children: ReactNode;
}

/**
 * A folha do livro. Ocupa toda a largura que a moldura deixar, e cada tela
 * decide como dividir esse espaço em colunas.
 */
export function Sheet({ margin = 'plain', children }: SheetProps) {
	return (
		<main className={styles.sheet}>
			<div className={styles.inner} data-margin={margin}>
				{children}
			</div>
		</main>
	);
}
