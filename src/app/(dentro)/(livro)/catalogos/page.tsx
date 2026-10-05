import { Catalogs } from '@/components/Catalogs';
import { OwnerOnly } from '@/components/Guard';

export default function CatalogsPage() {
	return (
		<OwnerOnly>
			<Catalogs />
		</OwnerOnly>
	);
}
