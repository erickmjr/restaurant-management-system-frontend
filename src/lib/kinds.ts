import type { LineKind } from '@/components/LedgerRow';

/** A URL fala português, o código fala o idioma da API. */
export function kindFromSlug(slug: string | undefined): LineKind | null {
	if (slug === 'entrada') return 'entry';
	if (slug === 'saida') return 'expense';

	return null;
}
