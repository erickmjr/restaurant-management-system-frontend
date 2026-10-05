import { notFound } from 'next/navigation';
import { EnterDemo } from '@/components/EnterDemo';
import { DEMO_AVAILABLE } from '@/lib/demo';

// /demo entra como dono, sem login e sem API, para navegar pelas telas.
export default function DemoPage() {
	if (!DEMO_AVAILABLE) notFound();

	return <EnterDemo as="owner" />;
}
