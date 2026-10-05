'use client';

import { type UseQueryResult, useMutation, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, type ReactNode, useState } from 'react';
import { messageOf } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import {
	keys,
	useExpenseCategories,
	usePaymentMethods,
	usePaymentTags,
} from '@/lib/api/queries';
import type { CatalogItem, PaymentMethod } from '@/lib/api/types';
import { Button } from './Button';
import styles from './Catalogs.module.css';
import { inputClass } from './Field';
import { Cross, PencilIcon, Plus } from './icons';
import { Sheet } from './Sheet';

const NAME_MAX = 120;

/** O apêndice do livro. Lista simples, régua entre itens, e renomear acontece no lugar. */
export function Catalogs() {
	const methods = usePaymentMethods();
	const categories = useExpenseCategories();
	const tags = usePaymentTags();

	return (
		<Sheet>
			<header className={styles.header}>
				<p className="label">Administração</p>
				<h1 className={styles.title}>Catálogos</h1>
				<p className={styles.lede}>Selecione um nome para renomear.</p>
			</header>

			{/* Com largura, os três catálogos ficam lado a lado. No celular, um embaixo do outro. */}
			<div className={styles.columns}>
				<CatalogSection
					title="Métodos de pagamento"
					placeholder="Novo método"
					query={methods}
					queryKey={keys.paymentMethods}
					create={api.createPaymentMethod}
					rename={api.renamePaymentMethod}
					renderExtra={(method) => <MethodTags method={method} tags={tags.data ?? []} />}
				/>

				<CatalogSection
					title="Categorias de saída"
					placeholder="Nova categoria"
					query={categories}
					queryKey={keys.expenseCategories}
					create={api.createExpenseCategory}
					rename={api.renameExpenseCategory}
				/>

				<CatalogSection
					title="Tags de pagamento"
					placeholder="Nova tag"
					query={tags}
					queryKey={keys.paymentTags}
					create={api.createPaymentTag}
					rename={api.renamePaymentTag}
				/>
			</div>
		</Sheet>
	);
}

interface CatalogSectionProps<T extends CatalogItem> {
	title: string;
	placeholder: string;
	query: UseQueryResult<T[]>;
	queryKey: readonly string[];
	create: (name: string) => Promise<T>;
	rename: (id: string, name: string) => Promise<T>;
	renderExtra?: (item: T) => ReactNode;
}

function CatalogSection<T extends CatalogItem>({
	title,
	placeholder,
	query,
	queryKey,
	create,
	rename,
	renderExtra,
}: CatalogSectionProps<T>) {
	const client = useQueryClient();
	const [draft, setDraft] = useState('');

	const add = useMutation({
		mutationFn: create,
		onSuccess: () => {
			setDraft('');

			return client.invalidateQueries({ queryKey });
		},
	});

	function submit(event: FormEvent) {
		event.preventDefault();

		// Aparar aqui evita a diferença entre "" e "   " que a API faz.
		const name = draft.trim();

		if (name === '' || add.isPending) return;

		add.mutate(name);
	}

	return (
		<section className={styles.section}>
			<h2 className={styles.heading}>{title}</h2>

			{query.isPending && <p className={styles.nothing}>Carregando</p>}

			{query.isError && (
				<p className={`error ${styles.line}`} role="alert">
					{messageOf(query.error)}
				</p>
			)}

			{query.isSuccess && query.data.length === 0 && (
				<p className={styles.nothing}>Nenhum item cadastrado</p>
			)}

			{query.isSuccess && query.data.length > 0 && (
				<ul>
					{query.data.map((item) => (
						<CatalogRow
							key={item.id}
							item={item}
							queryKey={queryKey}
							rename={rename}
							extra={renderExtra?.(item)}
						/>
					))}
				</ul>
			)}

			{/* Criar é um campo no pé da lista. O erro mora debaixo dele, nunca em toast. */}
			<form className={styles.create} onSubmit={submit}>
				<div className={styles.createRow}>
					<input
						className={inputClass}
						aria-label={`${title}, ${placeholder.toLowerCase()}`}
						placeholder={placeholder}
						maxLength={NAME_MAX}
						value={draft}
						onChange={(event) => {
							setDraft(event.target.value);
							if (add.isError) add.reset();
						}}
						aria-invalid={add.isError || undefined}
					/>
					<Button type="submit" variant="outline" disabled={add.isPending}>
						<Plus />
						Adicionar
					</Button>
				</div>
				{add.isError && (
					<p className="error" role="alert">
						{messageOf(add.error)}
					</p>
				)}
			</form>
		</section>
	);
}

interface CatalogRowProps<T extends CatalogItem> {
	item: T;
	queryKey: readonly string[];
	rename: (id: string, name: string) => Promise<T>;
	extra?: ReactNode;
}

function CatalogRow<T extends CatalogItem>({ item, queryKey, rename, extra }: CatalogRowProps<T>) {
	const client = useQueryClient();
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(item.name);

	const save = useMutation({
		mutationFn: (name: string) => rename(item.id, name),
		onSuccess: () => {
			setEditing(false);

			// O nome é resolvido na consulta, então os dias e os relatórios já abertos ficaram velhos.
			void client.invalidateQueries({ queryKey: ['balance'] });
			void client.invalidateQueries({ queryKey: keys.reports });

			return client.invalidateQueries({ queryKey });
		},
	});

	function start() {
		save.reset();
		setDraft(item.name);
		setEditing(true);
	}

	function submit(event: FormEvent) {
		event.preventDefault();

		const name = draft.trim();

		if (name === '' || save.isPending) return;

		if (name === item.name) {
			setEditing(false);

			return;
		}

		save.mutate(name);
	}

	return (
		<li className={styles.row}>
			{editing ? (
				<form className={styles.rename} onSubmit={submit}>
					<div className={styles.createRow}>
						<input
							className={inputClass}
							aria-label={`Novo nome para ${item.name}`}
							maxLength={NAME_MAX}
							value={draft}
							onChange={(event) => {
								setDraft(event.target.value);
								if (save.isError) save.reset();
							}}
							onFocus={(event) => event.target.select()}
							onKeyDown={(event) => {
								if (event.key === 'Escape') setEditing(false);
							}}
							aria-invalid={save.isError || undefined}
							autoFocus
						/>
						<Button type="submit" disabled={save.isPending}>
							Salvar
						</Button>
					</div>
					{save.isError && (
						<p className="error" role="alert">
							{messageOf(save.error)}
						</p>
					)}
					<div className={styles.renameFoot}>
						{/* O dono não espera que mudar "Cartão" mude o relatório do ano passado. */}
						<p className={styles.warning}>O nome muda também em todos os lançamentos antigos.</p>
						<button type="button" className="link" onClick={() => setEditing(false)}>
							Cancelar
						</button>
					</div>
				</form>
			) : (
				<button
					type="button"
					className={styles.name}
					onClick={start}
					aria-label={`Renomear ${item.name}`}
				>
					<span>{item.name}</span>
					<PencilIcon className={styles.pencil} />
				</button>
			)}
			{extra}
		</li>
	);
}

/** As tags de um método, como pastilhas pequenas. Um x remove, um + anexa. */
function MethodTags({ method, tags }: { method: PaymentMethod; tags: CatalogItem[] }) {
	const client = useQueryClient();
	const [picking, setPicking] = useState(false);

	const put = (updated: PaymentMethod) =>
		client.setQueryData<PaymentMethod[]>(keys.paymentMethods, (list) =>
			list?.map((current) => (current.id === updated.id ? updated : current)),
		);

	const attach = useMutation({
		mutationFn: (tagId: string) => api.attachTag(method.id, tagId),
		onSuccess: (updated) => {
			put(updated);
			setPicking(false);
		},
	});

	const detach = useMutation({
		mutationFn: (tagId: string) => api.detachTag(method.id, tagId),
		onSuccess: put,
	});

	const attached = tags.filter((tag) => method.tagIds.includes(tag.id));
	const available = tags.filter((tag) => !method.tagIds.includes(tag.id));
	const failure = attach.error ?? detach.error;

	return (
		<div className={styles.tags}>
			{attached.map((tag) => (
				<span key={tag.id} className={styles.tag}>
					{tag.name}
					<button
						type="button"
						className={styles.tagRemove}
						onClick={() => detach.mutate(tag.id)}
						disabled={detach.isPending}
						aria-label={`Remover a tag ${tag.name} de ${method.name}`}
					>
						<Cross />
					</button>
				</span>
			))}

			<button
				type="button"
				className={styles.tagAdd}
				onClick={() => setPicking((current) => !current)}
				aria-expanded={picking}
				aria-label={`Anexar tag a ${method.name}`}
			>
				<Plus />
			</button>

			{picking &&
				(available.length === 0 ? (
					<span className={styles.tagHint}>
						{tags.length === 0
							? 'Crie uma tag primeiro, em Tags de pagamento'
							: 'Todas as tags já estão aqui'}
					</span>
				) : (
					available.map((tag) => (
						<button
							key={tag.id}
							type="button"
							className={styles.tagOption}
							onClick={() => attach.mutate(tag.id)}
							disabled={attach.isPending}
						>
							{tag.name}
						</button>
					))
				))}

			{failure !== null && (
				<p className={`error ${styles.tagError}`} role="alert">
					{messageOf(failure)}
				</p>
			)}
		</div>
	);
}
