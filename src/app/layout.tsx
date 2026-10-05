import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans, Instrument_Serif } from 'next/font/google';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import './globals.css';

// Três famílias, cada uma com um papel que não se mistura.
// Serif é a voz do documento, sans é interface, mono é todo valor, horário e id.
const serif = Instrument_Serif({
	weight: '400',
	subsets: ['latin'],
	variable: '--font-serif',
	display: 'swap',
});

const sans = IBM_Plex_Sans({
	weight: ['400', '500', '600'],
	subsets: ['latin'],
	variable: '--font-sans',
	display: 'swap',
});

const mono = IBM_Plex_Mono({
	weight: ['400', '500'],
	subsets: ['latin'],
	variable: '--font-mono',
	display: 'swap',
});

export const metadata: Metadata = {
	title: 'Livro de caixa',
	description: 'Fluxo de caixa do restaurante, uma página por dia.',
};

export const viewport: Viewport = {
	width: 'device-width',
	initialScale: 1,
	themeColor: [
		{ media: '(prefers-color-scheme: light)', color: '#f5f1e8' },
		{ media: '(prefers-color-scheme: dark)', color: '#15120e' },
	],
};

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="pt-BR" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
			<body>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
