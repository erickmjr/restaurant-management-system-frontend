import { ApiError, request } from './client';
import type {
	Balance,
	CashFlowReport,
	CatalogItem,
	CreatedEntry,
	CreatedExpense,
	CreatedOperator,
	CreateEntryBody,
	CreateExpenseBody,
	CreateOperatorBody,
	LoginBody,
	LoginResponse,
	Me,
	PaymentMethod,
	Restaurant,
	UpdateEntryBody,
	UpdateExpenseBody,
} from './types';

// O restaurante nunca aparece aqui, fora do login. Ele sai do token.

const id = encodeURIComponent;

export const api = {
	login: (body: LoginBody) => request<LoginResponse>('POST', '/auth/login', body),
	me: () => request<Me>('GET', '/me'),

	/**
	 * O restaurante da sessão, para mostrar o nome no índice.
	 *
	 * A API ainda não tem esta rota. Nenhuma resposta dela devolve o nome do
	 * restaurante depois do cadastro. Enquanto for assim, a chamada volta 404,
	 * isto devolve null, e a tela mostra o nome do produto no lugar.
	 * O contrato esperado é GET /restaurants/me com token, devolvendo
	 * { restaurantId, name }.
	 */
	async restaurant(): Promise<Restaurant | null> {
		try {
			return await request<Restaurant>('GET', '/restaurants/me');
		} catch (error) {
			if (error instanceof ApiError && error.status === 404) return null;

			throw error;
		}
	},

	/** Dia sem lançamento volta 404 e isso é página em branco, não erro. */
	async balance(competence: string): Promise<Balance | null> {
		try {
			return await request<Balance>('GET', `/balances/${id(competence)}`);
		} catch (error) {
			if (error instanceof ApiError && error.code === 'BALANCE_NOT_FOUND') return null;

			throw error;
		}
	},

	report: (from: string, to: string) =>
		request<CashFlowReport>('GET', `/reports/cash-flow?from=${id(from)}&to=${id(to)}`),

	createEntry: (body: CreateEntryBody) => request<CreatedEntry>('POST', '/entries', body),
	updateEntry: (entryId: string, body: UpdateEntryBody) =>
		request<unknown>('PATCH', `/entries/${id(entryId)}`, body),
	removeEntry: (entryId: string) => request<void>('DELETE', `/entries/${id(entryId)}`),

	createExpense: (body: CreateExpenseBody) => request<CreatedExpense>('POST', '/expenses', body),
	updateExpense: (expenseId: string, body: UpdateExpenseBody) =>
		request<unknown>('PATCH', `/expenses/${id(expenseId)}`, body),
	removeExpense: (expenseId: string) => request<void>('DELETE', `/expenses/${id(expenseId)}`),

	paymentMethods: () => request<PaymentMethod[]>('GET', '/payment-methods'),
	createPaymentMethod: (name: string) =>
		request<PaymentMethod>('POST', '/payment-methods', { name }),
	renamePaymentMethod: (itemId: string, name: string) =>
		request<PaymentMethod>('PATCH', `/payment-methods/${id(itemId)}`, { name }),
	attachTag: (methodId: string, paymentTagId: string) =>
		request<PaymentMethod>('POST', `/payment-methods/${id(methodId)}/tags`, { paymentTagId }),
	detachTag: (methodId: string, tagId: string) =>
		request<PaymentMethod>('DELETE', `/payment-methods/${id(methodId)}/tags/${id(tagId)}`),

	expenseCategories: () => request<CatalogItem[]>('GET', '/expense-categories'),
	createExpenseCategory: (name: string) =>
		request<CatalogItem>('POST', '/expense-categories', { name }),
	renameExpenseCategory: (itemId: string, name: string) =>
		request<CatalogItem>('PATCH', `/expense-categories/${id(itemId)}`, { name }),

	paymentTags: () => request<CatalogItem[]>('GET', '/payment-tags'),
	createPaymentTag: (name: string) => request<CatalogItem>('POST', '/payment-tags', { name }),
	renamePaymentTag: (itemId: string, name: string) =>
		request<CatalogItem>('PATCH', `/payment-tags/${id(itemId)}`, { name }),

	createOperator: (body: CreateOperatorBody) => request<CreatedOperator>('POST', '/operators', body),
};
