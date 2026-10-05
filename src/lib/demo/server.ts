// A API de mentira do modo de demonstração. Mora no navegador e guarda os dados
// no sessionStorage, então cada aba tem a sua cópia e nada sai da máquina.
//
// Ela imita as regras que aparecem na tela, que são a janela de três dias,
// o papel do operador e o nome repetido em catálogo. Não é a referência da API.
// A referência é api-documentation.md.

import { ApiError } from '@/lib/api/client';
import type { CatalogItem, Operator, PaymentMethod } from '@/lib/api/types';
import { addDays, isValidCompetence, todayCompetence } from '@/lib/dates';
import { DEMO_LOGINS } from './index';

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_MS = 3 * DAY_MS;
const STORAGE_KEY = 'caixa.demo.db.v4';
/** Quanto de passado a demonstração tem. Dá para comparar um mês com o mesmo mês do ano anterior. */
const HISTORY_DAYS = 560;

type Kind = 'entries' | 'expenses';
type Body = Record<string, unknown>;

interface Row {
	id: string;
	operatorId: string;
	/** Método de pagamento na entrada, categoria na saída. */
	optionId: string;
	amountInCents: number;
	observation: string | null;
	createdAt: string;
	updatedAt: string;
	updatedBy: string;
}

interface Sheet {
	id: string;
	competence: string;
	createdAt: string;
	updatedAt: string;
	updatedBy: string;
	entries: Row[];
	expenses: Row[];
}

interface Db {
	seq: number;
	methods: PaymentMethod[];
	categories: CatalogItem[];
	tags: CatalogItem[];
	sheets: Record<string, Sheet>;
	emails: string[];
}

function fail(
	status: number,
	code: string,
	message: string,
	details: Record<string, unknown> = {},
): never {
	throw new ApiError(status, code, message, details);
}

// ---------------------------------------------------------------- dados

function addRow(
	db: Db,
	kind: Kind,
	competence: string,
	operatorId: string,
	optionId: string,
	amountInCents: number,
	observation: string | null,
	at: number,
): { sheet: Sheet; row: Row } {
	const instant = new Date(at).toISOString();

	// O balanço nasce no primeiro lançamento da competência, e a janela conta daqui.
	let sheet = db.sheets[competence];

	if (sheet === undefined) {
		db.seq += 1;
		sheet = {
			id: `b-${db.seq}`,
			competence,
			createdAt: instant,
			updatedAt: instant,
			updatedBy: operatorId,
			entries: [],
			expenses: [],
		};
		db.sheets[competence] = sheet;
	}

	db.seq += 1;

	const row: Row = {
		id: `${kind === 'entries' ? 'e' : 'x'}-${db.seq}`,
		operatorId,
		optionId,
		amountInCents,
		observation,
		createdAt: instant,
		updatedAt: instant,
		updatedBy: operatorId,
	};

	sheet[kind].push(row);
	sheet.updatedAt = instant;
	sheet.updatedBy = operatorId;

	return { sheet, row };
}

function seed(now: number): Db {
	const db: Db = {
		seq: 0,
		methods: [],
		categories: [],
		tags: [],
		sheets: {},
		emails: [DEMO_LOGINS.owner.operator.email, DEMO_LOGINS.employee.operator.email],
	};

	const born = new Date(now - (HISTORY_DAYS + 20) * DAY_MS).toISOString();
	const item = (prefix: string, name: string): CatalogItem => {
		db.seq += 1;

		return { id: `${prefix}-${db.seq}`, name, createdAt: born, updatedAt: born };
	};

	const maquininha = item('pt', 'Maquininha');
	const temTaxa = item('pt', 'Tem taxa');
	const naHora = item('pt', 'Na hora');
	db.tags = [maquininha, temTaxa, naHora];

	const dinheiro: PaymentMethod = { ...item('pm', 'Dinheiro'), tagIds: [naHora.id] };
	const pix: PaymentMethod = { ...item('pm', 'Pix'), tagIds: [naHora.id] };
	const credito: PaymentMethod = {
		...item('pm', 'Cartão de crédito'),
		tagIds: [maquininha.id, temTaxa.id],
	};
	const debito: PaymentMethod = { ...item('pm', 'Cartão de débito'), tagIds: [maquininha.id] };
	const vale: PaymentMethod = { ...item('pm', 'Vale-refeição'), tagIds: [] };
	db.methods = [dinheiro, pix, credito, debito, vale];

	const fornecedor = item('ec', 'Fornecedor');
	const gas = item('ec', 'Gás');
	const folha = item('ec', 'Folha');
	const aluguel = item('ec', 'Aluguel');
	const manutencao = item('ec', 'Manutenção');
	db.categories = [fornecedor, gas, folha, aluguel, manutencao];

	const owner = DEMO_LOGINS.owner.operator.id;
	const employee = DEMO_LOGINS.employee.operator.id;
	const today = todayCompetence(now);

	// Sorteio com semente fixa, para o livro ser o mesmo toda vez.
	let state = 7;
	const random = () => {
		state = (state * 1103515245 + 12345) % 2147483648;

		return state / 2147483648;
	};
	// O restaurante cresce com o tempo. Quanto mais antigo o dia, menor o movimento,
	// para a comparação entre anos ter diferença para mostrar.
	let growth = 1;
	const reais = (min: number, spread: number, factor = 1) =>
		Math.round((min + random() * spread) * factor * growth) * 100;

	// O passado. Esses balanços nasceram há mais de três dias, então já estão travados.
	let opened = 0;

	for (let back = HISTORY_DAYS; back >= 4; back -= 1) {
		const competence = addDays(today, -back);
		const weekday = new Date(`${competence}T12:00:00Z`).getUTCDay();

		// O restaurante fecha às segundas.
		if (weekday === 1) continue;

		opened += 1;
		growth = 1 - 0.28 * (back / HISTORY_DAYS);

		const at = now - back * DAY_MS;
		const busy = weekday === 0 || weekday >= 5 ? 1.8 : 1;

		addRow(db, 'entries', competence, employee, dinheiro.id, reais(400, 900, busy), null, at);
		addRow(db, 'entries', competence, employee, pix.id, reais(600, 1200, busy) + 50, null, at);
		addRow(db, 'entries', competence, employee, credito.id, reais(900, 1500, busy) + 90, null, at);

		if (random() > 0.4) {
			addRow(db, 'entries', competence, employee, debito.id, reais(300, 600), null, at);
		}

		if (random() > 0.3) {
			addRow(db, 'expenses', competence, owner, fornecedor.id, reais(300, 1400), null, at);
		}

		if (opened % 9 === 0) {
			addRow(db, 'expenses', competence, owner, gas.id, 42000, 'Dois botijões P45', at);
		}

		if (opened % 26 === 6) {
			addRow(db, 'expenses', competence, owner, aluguel.id, 680000, null, at);
		}

		if (opened % 26 === 18) {
			addRow(db, 'expenses', competence, owner, folha.id, 1240000, 'Pagamento do mês', at);
		}

		if (opened === 26 || opened === 70) {
			addRow(db, 'expenses', competence, owner, manutencao.id, 185000, 'Conserto da coifa', at);
		}
	}

	// Ontem nasceu há 20 horas e hoje há 4, então as duas janelas ainda correm.
	growth = 1;

	const yesterday = addDays(today, -1);
	const yesterdayAt = now - 20 * 60 * 60 * 1000;
	addRow(db, 'entries', yesterday, employee, dinheiro.id, 98000, null, yesterdayAt);
	addRow(db, 'entries', yesterday, employee, pix.id, 143050, 'Inclui encomenda da festa', yesterdayAt);
	addRow(db, 'entries', yesterday, owner, credito.id, 211590, null, yesterdayAt);
	addRow(db, 'expenses', yesterday, owner, fornecedor.id, 86000, 'Hortifruti', yesterdayAt);

	const todayAt = now - 4 * 60 * 60 * 1000;
	addRow(db, 'entries', today, employee, dinheiro.id, 125000, 'Movimento do almoço', todayAt);
	addRow(db, 'entries', today, owner, pix.id, 86050, null, todayAt);
	addRow(db, 'expenses', today, owner, fornecedor.id, 40000, 'Entrega de bebidas', todayAt);

	return db;
}

let cached: Db | null = null;

function open(): Db {
	if (cached !== null) return cached;

	try {
		const raw = sessionStorage.getItem(STORAGE_KEY);

		if (raw !== null) {
			cached = JSON.parse(raw) as Db;

			return cached;
		}
	} catch {
		// Sem sessionStorage, os dados vivem só na memória desta página.
	}

	cached = seed(Date.now());

	return cached;
}

function save(db: Db): void {
	try {
		sessionStorage.setItem(STORAGE_KEY, JSON.stringify(db));
	} catch {
		// Idem.
	}
}

// ---------------------------------------------------------------- regras

function lockedAtOf(sheet: Sheet): number {
	return Date.parse(sheet.createdAt) + WINDOW_MS;
}

function assertOpen(sheet: Sheet): void {
	if (Date.now() >= lockedAtOf(sheet)) {
		fail(422, 'BALANCE_LOCKED', 'A janela de três dias deste balanço já fechou.', {
			balanceId: sheet.id,
			createdAt: sheet.createdAt,
			now: new Date().toISOString(),
		});
	}
}

function assertOwner(operator: Operator): void {
	if (operator.role !== 'OWNER') {
		fail(403, 'INSUFFICIENT_ROLE', 'Seu papel não permite esta operação.');
	}
}

function readAmount(value: unknown, zeroCode: string): number {
	if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
		fail(400, 'INVALID_REQUEST', 'Requisição inválida.', {
			issues: [{ path: 'amountInCents', message: 'Valor deve ser inteiro em centavos.' }],
		});
	}

	if (value === 0) fail(422, zeroCode, 'O valor do lançamento não pode ser zero.');

	return value;
}

/** String vazia ou só espaço vira null, como na API. */
function readNote(value: unknown): string | null {
	return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function nameOf(list: CatalogItem[], id: string): string {
	return list.find((item) => item.id === id)?.name ?? '';
}

function byName<T extends CatalogItem>(list: T[]): T[] {
	return [...list].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

function sum(rows: Row[]): number {
	return rows.reduce((total, row) => total + row.amountInCents, 0);
}

// ---------------------------------------------------------------- consultas

function balanceView(db: Db, sheet: Sheet) {
	const totalEntriesInCents = sum(sheet.entries);
	const totalExpensesInCents = sum(sheet.expenses);
	const line = ({ optionId, ...rest }: Row) => rest;

	return {
		id: sheet.id,
		restaurantId: DEMO_LOGINS.owner.operator.restaurantId,
		competence: sheet.competence,
		createdAt: sheet.createdAt,
		updatedAt: sheet.updatedAt,
		updatedBy: sheet.updatedBy,
		lockedAt: new Date(lockedAtOf(sheet)).toISOString(),
		isLocked: Date.now() >= lockedAtOf(sheet),
		totalEntriesInCents,
		totalExpensesInCents,
		netInCents: totalEntriesInCents - totalExpensesInCents,
		// O lançamento guarda só o id. O nome é resolvido aqui, e por isso renomear reescreve o histórico.
		entries: sheet.entries.map((row) => ({
			...line(row),
			paymentMethodId: row.optionId,
			paymentMethodName: nameOf(db.methods, row.optionId),
		})),
		expenses: sheet.expenses.map((row) => ({
			...line(row),
			expenseCategoryId: row.optionId,
			expenseCategoryName: nameOf(db.categories, row.optionId),
		})),
	};
}

function slices(rows: Row[], catalog: CatalogItem[]) {
	const totals = new Map<string, number>();

	for (const row of rows) {
		totals.set(row.optionId, (totals.get(row.optionId) ?? 0) + row.amountInCents);
	}

	return [...totals]
		.map(([id, totalInCents]) => ({ id, name: nameOf(catalog, id), totalInCents }))
		.sort((a, b) => b.totalInCents - a.totalInCents);
}

function reportView(db: Db, from: string, to: string) {
	if (!isValidCompetence(from) || !isValidCompetence(to) || from > to) {
		fail(400, 'INVALID_REQUEST', 'Requisição inválida.', {
			issues: [{ path: '', message: 'A data inicial não pode ser depois da final.' }],
		});
	}

	// Dia sem lançamento não tem balanço, então não aparece.
	const sheets = Object.values(db.sheets)
		.filter((sheet) => sheet.competence >= from && sheet.competence <= to)
		.filter((sheet) => sheet.entries.length + sheet.expenses.length > 0)
		.sort((a, b) => a.competence.localeCompare(b.competence));

	const days = sheets.map((sheet) => {
		const totalEntriesInCents = sum(sheet.entries);
		const totalExpensesInCents = sum(sheet.expenses);

		return {
			id: sheet.id,
			competence: sheet.competence,
			totalEntriesInCents,
			totalExpensesInCents,
			netInCents: totalEntriesInCents - totalExpensesInCents,
		};
	});

	const totalEntriesInCents = days.reduce((total, day) => total + day.totalEntriesInCents, 0);
	const totalExpensesInCents = days.reduce((total, day) => total + day.totalExpensesInCents, 0);

	return {
		from,
		to,
		totalEntriesInCents,
		totalExpensesInCents,
		netInCents: totalEntriesInCents - totalExpensesInCents,
		days,
		byPaymentMethod: slices(sheets.flatMap((sheet) => sheet.entries), db.methods),
		byExpenseCategory: slices(sheets.flatMap((sheet) => sheet.expenses), db.categories),
	};
}

// ---------------------------------------------------------------- lançamentos

function findRow(db: Db, kind: Kind, id: string): { sheet: Sheet; row: Row } | null {
	for (const sheet of Object.values(db.sheets)) {
		const row = sheet[kind].find((candidate) => candidate.id === id);

		if (row !== undefined) return { sheet, row };
	}

	return null;
}

function ledger(
	db: Db,
	kind: Kind,
	method: string,
	id: string | undefined,
	body: Body,
	operator: Operator,
): unknown {
	const isEntry = kind === 'entries';
	const options = isEntry ? db.methods : db.categories;
	const optionKey = isEntry ? 'paymentMethodId' : 'expenseCategoryId';
	const idKey = isEntry ? 'entryId' : 'expenseId';
	const zeroCode = isEntry ? 'ENTRY_AMOUNT_ZERO' : 'EXPENSE_AMOUNT_ZERO';

	const readOption = (value: unknown): string => {
		const optionId = typeof value === 'string' ? value : '';

		if (!options.some((option) => option.id === optionId)) {
			if (isEntry) fail(404, 'PAYMENT_METHOD_NOT_FOUND', 'Método de pagamento não encontrado.');

			fail(404, 'EXPENSE_CATEGORY_NOT_FOUND', 'Categoria de saída não encontrada.');
		}

		return optionId;
	};

	if (method === 'POST' && id === undefined) {
		const competence = typeof body.competence === 'string' ? body.competence : '';

		if (!isValidCompetence(competence)) fail(400, 'COMPETENCE_INVALID', 'Competência inválida.');

		if (competence > todayCompetence()) {
			fail(422, 'COMPETENCE_IN_FUTURE', 'A competência não pode ser depois de hoje.');
		}

		const amountInCents = readAmount(body.amountInCents, zeroCode);
		const optionId = readOption(body[optionKey]);
		const existing = db.sheets[competence];

		if (existing !== undefined) assertOpen(existing);

		const { sheet, row } = addRow(
			db,
			kind,
			competence,
			operator.id,
			optionId,
			amountInCents,
			readNote(body.observation),
			Date.now(),
		);

		return {
			[idKey]: row.id,
			balanceId: sheet.id,
			competence,
			amountInCents,
			createdAt: row.createdAt,
			balanceLockedAt: new Date(lockedAtOf(sheet)).toISOString(),
		};
	}

	const found = id === undefined ? null : findRow(db, kind, id);

	if (found === null) {
		if (isEntry) fail(404, 'ENTRY_NOT_FOUND', 'Entrada não encontrada.');

		fail(404, 'EXPENSE_NOT_FOUND', 'Saída não encontrada.');
	}

	const { sheet, row } = found;

	// A trava não tem exceção, nem para o dono.
	assertOpen(sheet);

	if (operator.role !== 'OWNER' && row.operatorId !== operator.id) {
		fail(403, 'INSUFFICIENT_ROLE', 'Só o dono mexe em lançamento de outro operador.');
	}

	const now = new Date().toISOString();

	if (method === 'DELETE') {
		sheet[kind] = sheet[kind].filter((candidate) => candidate.id !== row.id);
		sheet.updatedAt = now;
		sheet.updatedBy = operator.id;

		return undefined;
	}

	if (method === 'PATCH') {
		if (Object.keys(body).length === 0) {
			fail(400, 'INVALID_REQUEST', 'Requisição inválida.', {
				issues: [{ path: '', message: 'Informe pelo menos um campo para alterar.' }],
			});
		}

		if (body.amountInCents !== undefined) row.amountInCents = readAmount(body.amountInCents, zeroCode);
		if (body[optionKey] !== undefined) row.optionId = readOption(body[optionKey]);

		// Omitir mantém, mandar null limpa.
		if ('observation' in body) row.observation = readNote(body.observation);

		row.updatedAt = now;
		row.updatedBy = operator.id;
		sheet.updatedAt = now;
		sheet.updatedBy = operator.id;

		return {
			[idKey]: row.id,
			balanceId: sheet.id,
			amountInCents: row.amountInCents,
			[optionKey]: row.optionId,
			observation: row.observation,
			updatedAt: now,
			updatedBy: operator.id,
		};
	}

	fail(404, 'ROUTE_NOT_FOUND', 'Rota não existe.');
}

// ---------------------------------------------------------------- catálogos

function catalog<T extends CatalogItem>(
	db: Db,
	list: T[],
	prefix: string,
	build: (base: CatalogItem) => T,
	notFoundCode: string,
	method: string,
	id: string | undefined,
	body: Body,
	operator: Operator,
): unknown {
	if (method === 'GET' && id === undefined) return byName(list);

	assertOwner(operator);

	const raw = typeof body.name === 'string' ? body.name : '';

	if (raw === '') {
		fail(400, 'INVALID_REQUEST', 'Requisição inválida.', {
			issues: [{ path: 'name', message: 'Nome é obrigatório.' }],
		});
	}

	const name = raw.trim();

	if (name === '') fail(400, 'CATALOG_NAME_EMPTY', 'O nome não pode ficar em branco.');

	// A comparação ignora maiúsculas. "Dinheiro" colide com "dinheiro".
	const clash = list.find((item) => item.name.toLowerCase() === name.toLowerCase());
	const now = new Date().toISOString();

	if (method === 'POST' && id === undefined) {
		if (clash !== undefined) {
			fail(409, 'CATALOG_NAME_IN_USE', 'Já existe um registro com este nome neste restaurante.');
		}

		db.seq += 1;

		const created = build({ id: `${prefix}-${db.seq}`, name, createdAt: now, updatedAt: now });

		list.push(created);

		return created;
	}

	if (method === 'PATCH' && id !== undefined) {
		const item = list.find((candidate) => candidate.id === id);

		if (item === undefined) fail(404, notFoundCode, 'Registro não encontrado.');

		if (clash !== undefined && clash.id !== item.id) {
			fail(409, 'CATALOG_NAME_IN_USE', 'Já existe um registro com este nome neste restaurante.');
		}

		item.name = name;
		item.updatedAt = now;

		return item;
	}

	fail(404, 'ROUTE_NOT_FOUND', 'Rota não existe.');
}

function methodTags(
	db: Db,
	method: string,
	methodId: string,
	tagId: string | undefined,
	body: Body,
	operator: Operator,
): unknown {
	assertOwner(operator);

	const paymentMethod = db.methods.find((candidate) => candidate.id === methodId);

	if (paymentMethod === undefined) {
		fail(404, 'PAYMENT_METHOD_NOT_FOUND', 'Método de pagamento não encontrado.');
	}

	if (method === 'POST' && tagId === undefined) {
		const paymentTagId = typeof body.paymentTagId === 'string' ? body.paymentTagId : '';

		if (!db.tags.some((tag) => tag.id === paymentTagId)) {
			fail(404, 'PAYMENT_TAG_NOT_FOUND', 'Tag de pagamento não encontrada.');
		}

		// Anexar duas vezes a mesma tag não dá erro.
		if (!paymentMethod.tagIds.includes(paymentTagId)) paymentMethod.tagIds.push(paymentTagId);

		return paymentMethod;
	}

	if (method === 'DELETE' && tagId !== undefined) {
		paymentMethod.tagIds = paymentMethod.tagIds.filter((current) => current !== tagId);

		return paymentMethod;
	}

	fail(404, 'ROUTE_NOT_FOUND', 'Rota não existe.');
}

function createOperator(db: Db, body: Body, operator: Operator): unknown {
	assertOwner(operator);

	const name = typeof body.name === 'string' ? body.name.trim() : '';
	const email = typeof body.email === 'string' ? body.email.trim() : '';

	if (name === '') fail(400, 'OPERATOR_NAME_EMPTY', 'O nome não pode ficar em branco.');

	if (db.emails.some((current) => current.toLowerCase() === email.toLowerCase())) {
		fail(409, 'OPERATOR_EMAIL_IN_USE', 'Já existe um operador com este email neste restaurante.');
	}

	db.seq += 1;
	db.emails.push(email);

	return {
		operatorId: `op-${db.seq}`,
		name,
		email,
		role: body.role === 'OWNER' ? 'OWNER' : 'EMPLOYEE',
		createdAt: new Date().toISOString(),
	};
}

// ---------------------------------------------------------------- rotas

function route(db: Db, method: string, path: string, body: Body, token: string | null): unknown {
	const [pathname = '', query = ''] = path.split('?');
	const [resource, id, sub, subId] = pathname.split('/').filter(Boolean).map(decodeURIComponent);

	const operator =
		Object.values(DEMO_LOGINS).find((login) => login.token === token)?.operator ?? null;

	if (operator === null) fail(401, 'INVALID_TOKEN', 'Token inválido ou expirado.');

	if (resource === 'restaurants' && id === 'me' && method === 'GET') {
		return { restaurantId: operator.restaurantId, name: 'Cantina da Praça' };
	}

	if (resource === 'me' && method === 'GET') {
		return { operatorId: operator.id, restaurantId: operator.restaurantId, role: operator.role };
	}

	if (resource === 'balances' && method === 'GET' && id !== undefined) {
		const sheet = db.sheets[id];

		if (sheet === undefined) {
			fail(404, 'BALANCE_NOT_FOUND', 'Não há balanço para esta competência.');
		}

		return balanceView(db, sheet);
	}

	if (resource === 'reports' && id === 'cash-flow' && method === 'GET') {
		const params = new URLSearchParams(query);

		return reportView(db, params.get('from') ?? '', params.get('to') ?? '');
	}

	if (resource === 'entries') return ledger(db, 'entries', method, id, body, operator);
	if (resource === 'expenses') return ledger(db, 'expenses', method, id, body, operator);

	if (resource === 'payment-methods' && id !== undefined && sub === 'tags') {
		return methodTags(db, method, id, subId, body, operator);
	}

	if (resource === 'payment-methods') {
		return catalog(
			db,
			db.methods,
			'pm',
			(base) => ({ ...base, tagIds: [] }),
			'PAYMENT_METHOD_NOT_FOUND',
			method,
			id,
			body,
			operator,
		);
	}

	if (resource === 'expense-categories') {
		return catalog(
			db,
			db.categories,
			'ec',
			(base) => base,
			'EXPENSE_CATEGORY_NOT_FOUND',
			method,
			id,
			body,
			operator,
		);
	}

	if (resource === 'payment-tags') {
		return catalog(
			db,
			db.tags,
			'pt',
			(base) => base,
			'PAYMENT_TAG_NOT_FOUND',
			method,
			id,
			body,
			operator,
		);
	}

	if (resource === 'operators' && method === 'POST') return createOperator(db, body, operator);

	fail(404, 'ROUTE_NOT_FOUND', `Rota ${method} ${pathname} não existe.`);
}

/** A porta de entrada. Mesma assinatura do pedido de verdade, com um atraso pequeno para as telas de espera aparecerem. */
export async function demoRequest<T>(
	method: string,
	path: string,
	body: unknown,
	token: string | null,
): Promise<T> {
	await new Promise((resolve) => window.setTimeout(resolve, 120));

	const db = open();
	// O corpo passa por JSON como passaria pela rede, então campo undefined some.
	const wire = body === undefined ? {} : (JSON.parse(JSON.stringify(body)) as Body);
	const result = route(db, method, path, wire, token);

	// Leitura não muda nada, então só grava quando algo foi escrito.
	if (method !== 'GET') save(db);

	return (result === undefined ? undefined : JSON.parse(JSON.stringify(result))) as T;
}
