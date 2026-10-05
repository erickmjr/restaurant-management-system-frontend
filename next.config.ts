import type { NextConfig } from 'next';

// A API ainda não tem CORS. O navegador fala só com o Next, em /api/*,
// e o Next repassa para a API. É o equivalente ao proxy do Vite citado no briefing.
const apiUrl = (process.env.API_URL ?? 'http://localhost:3333').replace(/\/$/, '');

const config: NextConfig = {
	reactStrictMode: true,
	// O selo de desenvolvimento fica no canto de baixo, em cima do botão de lançar.
	devIndicators: false,
	async rewrites() {
		return [{ source: '/api/:path*', destination: `${apiUrl}/:path*` }];
	},
};

export default config;
