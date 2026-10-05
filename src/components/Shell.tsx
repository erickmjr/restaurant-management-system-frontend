'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType, ReactNode, SVGProps } from 'react';
import { PRODUCT_NAME, useMe, useRestaurantName } from '@/lib/api/queries';
import { cx } from '@/lib/cx';
import { useSession } from '@/stores/session';
import { CalendarIcon, ChartIcon, ListIcon, LogOutIcon, PageIcon, PersonPlusIcon } from './icons';
import styles from './Shell.module.css';

interface Item {
	href: string;
	label: string;
	icon: ComponentType<SVGProps<SVGSVGElement>>;
	ownerOnly?: boolean;
	/** Outros caminhos que também acendem este item. */
	alsoActive?: (pathname: string) => boolean;
}

const ITEMS: Item[] = [
	{ href: '/', label: 'Hoje', icon: PageIcon },
	{
		href: '/calendario',
		label: 'Calendário',
		icon: CalendarIcon,
		// A página de um dia que não é hoje foi aberta a partir do calendário.
		alsoActive: (pathname) => pathname.startsWith('/dia/'),
	},
	{ href: '/painel', label: 'Painel', icon: ChartIcon },
	{ href: '/catalogos', label: 'Catálogos', icon: ListIcon, ownerOnly: true },
	{ href: '/operadores', label: 'Operadores', icon: PersonPlusIcon, ownerOnly: true },
];

/**
 * A moldura do app. No celular, o nome do restaurante no alto e as abas no pé,
 * ao alcance do polegar. No computador, uma barra lateral, e o conteúdo fica
 * com todo o resto da largura.
 *
 * Funcionário vê só o que é dele. O resto não existe na tela.
 */
export function Shell({ children }: { children: ReactNode }) {
	const pathname = usePathname();
	const { isOwner } = useMe();
	const restaurantName = useRestaurantName();
	const operator = useSession((state) => state.operator);
	const signOut = useSession((state) => state.signOut);

	const items = ITEMS.filter((item) => isOwner || item.ownerOnly !== true);
	const isCurrent = (item: Item) =>
		pathname === item.href || (item.alsoActive?.(pathname) ?? false);

	const links = (className: string | undefined) =>
		items.map((item) => {
			const current = isCurrent(item);

			return (
				<Link
					key={item.href}
					href={item.href}
					className={cx(className, current && styles.current)}
					aria-current={current ? 'page' : undefined}
				>
					<item.icon />
					<span>{item.label}</span>
				</Link>
			);
		});

	return (
		<div className={styles.shell}>
			{/* Computador. */}
			<aside className={styles.side}>
				<div className={styles.brand}>
					{/* Sem nome de restaurante, o nome do produto aparece uma vez só. */}
					{restaurantName !== PRODUCT_NAME && <p className="label">{PRODUCT_NAME}</p>}
					<p className={styles.restaurant}>{restaurantName}</p>
				</div>

				<nav aria-label="Seções" className={styles.sideNav}>
					{links(styles.sideLink)}
				</nav>

				<div className={styles.account}>
					{operator !== null && (
						<p className={styles.operator}>
							<span className={styles.operatorName}>{operator.name}</span>
							<span className={styles.role}>{isOwner ? 'Dono' : 'Funcionário'}</span>
						</p>
					)}
					<button type="button" className={styles.sideLink} onClick={signOut}>
						<LogOutIcon />
						<span>Sair</span>
					</button>
				</div>
			</aside>

			<div className={styles.column}>
				{/* Celular. */}
				<header className={styles.top}>
					<p className={styles.topName}>{restaurantName}</p>
					<button type="button" className={styles.topOut} onClick={signOut}>
						<LogOutIcon />
						<span>Sair</span>
					</button>
				</header>

				<div className={styles.content}>{children}</div>
			</div>

			<nav aria-label="Seções" className={styles.tabs}>
				{links(styles.tab)}
			</nav>
		</div>
	);
}
