import Link from 'next/link';

export default function NotFound() {
	return (
		<main style={{ maxWidth: 420, padding: '40px 16px' }}>
			<h1 style={{ fontFamily: 'var(--serif)', fontSize: 44, lineHeight: 1.05 }}>
				Esta página não existe
			</h1>
			<p style={{ marginTop: 8, fontSize: 14, color: 'var(--tinta-media)' }}>
				O endereço pode estar errado, ou a página pode ter sido removida.
			</p>
			<Link className="link" href="/">
				Ir para a página de hoje
			</Link>
		</main>
	);
}
