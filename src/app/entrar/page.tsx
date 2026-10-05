'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { isApiError, messageOf } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import { PRODUCT_NAME } from '@/lib/api/queries';
import { useSession } from '@/stores/session';
import styles from './page.module.css';

const RULES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n'];

export default function SignInPage() {
	const router = useRouter();
	const hydrated = useSession((state) => state.hydrated);
	const signedIn = useSession((state) => state.token !== null);
	const savedRestaurantId = useSession((state) => state.lastRestaurantId);
	const savedRestaurantName = useSession((state) => state.restaurantName);
	const signIn = useSession((state) => state.signIn);

	const [otherRestaurant, setOtherRestaurant] = useState(false);
	const [restaurantCode, setRestaurantCode] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [codeMissing, setCodeMissing] = useState(false);

	// O código só aparece quando não há um guardado, ou quando a pessoa pede outro.
	const askCode = savedRestaurantId === null || otherRestaurant;
	// Com restaurante guardado e nome conhecido, a tela abre com o nome dele.
	const restaurantName = askCode ? null : savedRestaurantName;

	useEffect(() => {
		if (hydrated && signedIn) router.replace('/');
	}, [hydrated, signedIn, router]);

	const login = useMutation({
		mutationFn: api.login,
		onSuccess: (data) => {
			signIn(data);
			router.replace('/');
		},
	});

	function submit(event: FormEvent) {
		event.preventDefault();

		const restaurantId = askCode ? restaurantCode.trim() : (savedRestaurantId ?? '');

		if (restaurantId === '') {
			setCodeMissing(true);

			return;
		}

		setCodeMissing(false);
		login.mutate({ restaurantId, email: email.trim(), password });
	}

	const failure = login.error;
	const codeError = codeMissing
		? 'Informe o código do restaurante.'
		: isApiError(failure, 'INVALID_REQUEST')
			? failure.issueFor('restaurantId')
			: null;
	const emailError = isApiError(failure, 'INVALID_REQUEST') ? failure.issueFor('email') : null;
	const passwordError = isApiError(failure, 'INVALID_REQUEST')
		? failure.issueFor('password')
		: null;
	const formError =
		failure !== null && codeError === null && emailError === null && passwordError === null
			? messageOf(failure)
			: null;

	return (
		<main className={styles.page}>
			<div className={styles.column}>
				{restaurantName !== null && <p className="label">{PRODUCT_NAME}</p>}
				<h1 className={styles.title}>{restaurantName ?? PRODUCT_NAME}</h1>
				<p className={styles.lede}>Uma página por dia. Entre para abrir a de hoje.</p>

				{hydrated && !signedIn && (
					<form className={styles.form} onSubmit={submit} noValidate>
						{askCode && (
							<Field
								label="Código do restaurante"
								mono
								value={restaurantCode}
								onChange={(event) => setRestaurantCode(event.target.value)}
								error={codeError}
								hint="Peça este código a quem cadastrou você."
								autoCapitalize="none"
								autoCorrect="off"
								spellCheck={false}
								autoComplete="off"
								required
							/>
						)}

						<Field
							label="Email"
							type="email"
							inputMode="email"
							autoComplete="username"
							autoCapitalize="none"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							error={emailError}
							required
						/>

						<Field
							label="Senha"
							type="password"
							autoComplete="current-password"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							error={passwordError}
							required
						/>

						{formError !== null && (
							<p className="error" role="alert">
								{formError}
							</p>
						)}

						<Button type="submit" disabled={login.isPending} className={styles.submit}>
							{login.isPending ? 'Entrando' : 'Entrar'}
						</Button>

						{savedRestaurantId !== null && (
							<button
								type="button"
								className="link"
								onClick={() => {
									setOtherRestaurant((current) => !current);
									setCodeMissing(false);
								}}
							>
								{otherRestaurant
									? 'Voltar para o restaurante deste aparelho'
									: 'Entrar em outro restaurante'}
							</button>
						)}
					</form>
				)}

			</div>

			{/* Com largura, o resto da tela é a página do caderno, em branco, esperando o dia. */}
			<div className={styles.paper} aria-hidden="true">
				<p className={styles.motto}>Quanto entrou, quanto saiu, quanto sobrou.</p>
				<ul>
					{RULES.map((rule) => (
						<li key={rule} className={styles.rule} />
					))}
				</ul>
			</div>
		</main>
	);
}
