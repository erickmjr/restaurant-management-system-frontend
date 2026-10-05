import type { ReactNode } from 'react';
import { Shell } from '@/components/Shell';

// O modo de leitura. A moldura traz o nome do restaurante e a navegação.
export default function BookLayout({ children }: { children: ReactNode }) {
	return <Shell>{children}</Shell>;
}
