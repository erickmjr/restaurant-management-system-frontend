'use client';

import { useMutation } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { isApiError, messageOf } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import type { CreatedOperator, Role } from '@/lib/api/types';
import { useSession } from '@/stores/session';
import { Button } from './Button';
import { Chip, chipPairClass } from './Chip';
import { Field } from './Field';
import { CopyIcon, PersonPlusIcon } from './icons';
import styles from './NewOperator.module.css';
import { Sheet } from './Sheet';

interface Errors {
	name?: string;
	email?: string;
	password?: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Cadastro de operador. A API não lista operadores, então esta tela só cria
 * e não finge que lista.
 */
export function NewOperator() {
	const restaurantId = useSession((state) => state.operator?.restaurantId ?? null);

	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [role, setRole] = useState<Role>('EMPLOYEE');
	const [errors, setErrors] = useState<Errors>({});
	const [created, setCreated] = useState<CreatedOperator | null>(null);
	const [copied, setCopied] = useState(false);

	const create = useMutation({
		mutationFn: api.createOperator,
		onSuccess: (operator) => {
			setCreated(operator);
			setName('');
			setEmail('');
			setPassword('');
			setRole('EMPLOYEE');
		},
	});

	function submit(event: FormEvent) {
		event.preventDefault();

		const next: Errors = {};

		if (name.trim() === '') next.name = 'Informe o nome.';
		if (!EMAIL.test(email.trim())) next.email = 'Email inválido.';
		if (password.length < 8) next.password = 'A senha precisa de pelo menos 8 caracteres.';

		setErrors(next);

		if (Object.keys(next).length > 0 || create.isPending) return;

		setCreated(null);
		create.mutate({ name: name.trim(), email: email.trim(), password, role });
	}

	async function copyCode() {
		if (restaurantId === null) return;

		try {
			await navigator.clipboard.writeText(restaurantId);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 2000);
		} catch {
			// Sem área de transferência, o código continua na tela para copiar à mão.
		}
	}

	// Cada erro da API vai para debaixo do campo a que pertence.
	const failure = create.error;
	const invalid = isApiError(failure, 'INVALID_REQUEST') ? failure : null;
	const nameError =
		errors.name ??
		invalid?.issueFor('name') ??
		(isApiError(failure, 'OPERATOR_NAME_EMPTY') ? failure.message : null);
	const emailError =
		errors.email ??
		invalid?.issueFor('email') ??
		(isApiError(failure, 'OPERATOR_EMAIL_IN_USE') ? failure.message : null);
	const passwordError = errors.password ?? invalid?.issueFor('password') ?? null;
	const formError =
		failure !== null && nameError === null && emailError === null && passwordError === null
			? messageOf(failure)
			: null;

	return (
		<Sheet>
			<header className={styles.header}>
				<p className="label">Administração</p>
				<h1 className={styles.title}>Novo operador</h1>
				<p className={styles.lede}>Cadastre quem vai lançar e consultar o caixa deste restaurante.</p>
			</header>

			{/* Com largura, o formulário fica de um lado e o código do restaurante do outro. */}
			<div className={styles.columns}>
				<form className={styles.form} onSubmit={submit} noValidate>
					<Field
						label="Nome"
						value={name}
						maxLength={120}
						autoComplete="off"
						onChange={(event) => setName(event.target.value)}
						error={nameError}
					/>

					<Field
						label="Email"
						type="email"
						inputMode="email"
						autoCapitalize="none"
						autoComplete="off"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						error={emailError}
					/>

					<Field
						label="Senha"
						type="password"
						autoComplete="new-password"
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						error={passwordError}
						hint="Mínimo de 8 caracteres. Anote a senha, pois ela não pode ser alterada depois."
					/>

					<div className={styles.role}>
						<span id="role-label" className="label">
							Papel
						</span>
						<div role="radiogroup" aria-labelledby="role-label" className={chipPairClass}>
							<Chip selected={role === 'EMPLOYEE'} onClick={() => setRole('EMPLOYEE')}>
								Funcionário
							</Chip>
							<Chip selected={role === 'OWNER'} onClick={() => setRole('OWNER')}>
								Dono
							</Chip>
						</div>
						<p className={styles.hint}>
							{role === 'OWNER'
								? 'O dono altera qualquer lançamento, gerencia os catálogos e cadastra operadores.'
								: 'O funcionário lança, consulta e corrige apenas os próprios lançamentos.'}
						</p>
					</div>

					{formError !== null && (
						<p className="error" role="alert">
							{formError}
						</p>
					)}

					<Button type="submit" disabled={create.isPending}>
						<PersonPlusIcon />
						{create.isPending ? 'Criando' : 'Criar operador'}
					</Button>

					{created !== null && (
						<p className={styles.created} role="status">
							Operador criado. {created.name} entra com {created.email}, a senha que você definiu e o
							código do restaurante.
						</p>
					)}
				</form>

				{restaurantId !== null && (
					<aside className={styles.code}>
						<h2 className="label">Código do restaurante</h2>
						<div className={styles.codeRow}>
							<code className={styles.codeValue}>{restaurantId}</code>
							<Button variant="outline" size="small" onClick={() => void copyCode()}>
								<CopyIcon />
								{copied ? 'Copiado' : 'Copiar'}
							</Button>
						</div>
						<p className={styles.hint}>
							Quem entra pela primeira vez num aparelho precisa deste código, além do email e da senha.
						</p>
					</aside>
				)}
			</div>
		</Sheet>
	);
}
