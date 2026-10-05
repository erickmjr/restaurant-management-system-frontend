'use client';

import { DayPage } from '@/components/DayPage';
import { useToday } from '@/hooks/useNow';

// A tela inicial é a página de hoje. É aqui que o funcionário vive.
export default function TodayPage() {
	const today = useToday();

	return <DayPage key={today} competence={today} />;
}
