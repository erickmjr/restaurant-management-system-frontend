// Formatos da API, como estão em api-documentation.md.

export type Role = 'OWNER' | 'EMPLOYEE';

export interface Operator {
	id: string;
	name: string;
	email: string;
	role: Role;
	restaurantId: string;
}

export interface LoginBody {
	restaurantId: string;
	email: string;
	password: string;
}

export interface LoginResponse {
	token: string;
	operator: Operator;
}

export interface Me {
	operatorId: string;
	restaurantId: string;
	role: Role;
}

/** O restaurante da sessão. A API ainda não tem esta rota. Ver api.restaurant. */
export interface Restaurant {
	restaurantId: string;
	name: string;
}

export interface EntryLine {
	id: string;
	operatorId: string;
	paymentMethodId: string;
	paymentMethodName: string;
	amountInCents: number;
	observation: string | null;
	createdAt: string;
	updatedAt: string;
	updatedBy: string;
}

export interface ExpenseLine {
	id: string;
	operatorId: string;
	expenseCategoryId: string;
	expenseCategoryName: string;
	amountInCents: number;
	observation: string | null;
	createdAt: string;
	updatedAt: string;
	updatedBy: string;
}

export interface Balance {
	id: string;
	restaurantId: string;
	competence: string;
	createdAt: string;
	updatedAt: string;
	updatedBy: string;
	lockedAt: string;
	isLocked: boolean;
	totalEntriesInCents: number;
	totalExpensesInCents: number;
	netInCents: number;
	entries: EntryLine[];
	expenses: ExpenseLine[];
}

export interface CreateEntryBody {
	competence: string;
	paymentMethodId: string;
	amountInCents: number;
	observation: string | null;
}

export interface CreateExpenseBody {
	competence: string;
	expenseCategoryId: string;
	amountInCents: number;
	observation: string | null;
}

export interface CreatedEntry {
	entryId: string;
	balanceId: string;
	competence: string;
	amountInCents: number;
	createdAt: string;
	balanceLockedAt: string;
}

export interface CreatedExpense {
	expenseId: string;
	balanceId: string;
	competence: string;
	amountInCents: number;
	createdAt: string;
	balanceLockedAt: string;
}

// No PATCH, campo omitido mantém e `null` limpa. Por isso `observation`
// é opcional E aceita null, e as duas coisas significam coisas diferentes.
export interface UpdateEntryBody {
	amountInCents?: number;
	paymentMethodId?: string;
	observation?: string | null;
}

export interface UpdateExpenseBody {
	amountInCents?: number;
	expenseCategoryId?: string;
	observation?: string | null;
}

export interface ReportDay {
	id: string;
	competence: string;
	totalEntriesInCents: number;
	totalExpensesInCents: number;
	netInCents: number;
}

export interface ReportSlice {
	id: string;
	name: string;
	totalInCents: number;
}

export interface CashFlowReport {
	from: string;
	to: string;
	totalEntriesInCents: number;
	totalExpensesInCents: number;
	netInCents: number;
	days: ReportDay[];
	byPaymentMethod: ReportSlice[];
	byExpenseCategory: ReportSlice[];
}

export interface CatalogItem {
	id: string;
	name: string;
	createdAt: string;
	updatedAt: string;
}

export interface PaymentMethod extends CatalogItem {
	tagIds: string[];
}

export interface CreateOperatorBody {
	name: string;
	email: string;
	password: string;
	role: Role;
}

export interface CreatedOperator {
	operatorId: string;
	name: string;
	email: string;
	role: Role;
	createdAt: string;
}

export interface ValidationIssue {
	path: string;
	message: string;
}
