import { notFound } from 'next/navigation';
import { EnterDemo } from '@/components/EnterDemo';
import { DEMO_AVAILABLE } from '@/lib/demo';

// /demo/funcionario entra como funcionária, para ver o que some da tela para esse papel.
export default function DemoEmployeePage() {
	if (!DEMO_AVAILABLE) notFound();

	return <EnterDemo as="employee" />;
}
