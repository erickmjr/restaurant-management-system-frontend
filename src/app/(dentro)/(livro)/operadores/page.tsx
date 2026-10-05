import { OwnerOnly } from '@/components/Guard';
import { NewOperator } from '@/components/NewOperator';

export default function OperatorsPage() {
	return (
		<OwnerOnly>
			<NewOperator />
		</OwnerOnly>
	);
}
