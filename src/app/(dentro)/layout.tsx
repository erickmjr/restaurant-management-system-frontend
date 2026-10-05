import type { ReactNode } from 'react';
import { Guard } from '@/components/Guard';

// Tudo aqui dentro exige sessão.
export default function InsideLayout({ children }: { children: ReactNode }) {
	return <Guard>{children}</Guard>;
}
