import { isDemoToken } from '@/lib/demo';
import { useSession } from '@/stores/session';
import type { ValidationIssue } from './types';

/** Erro no envelope da API. `code` é estável e decide comportamento, `message` é para exibir. */
export class ApiError extends Error {
	readonly status: number;
	readonly code: string;
	readonly details: Record<string, unknown>;

	constructor(status: number, code: string, message: string, details: Record<string, unknown> = {}) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
		this.code = code;
		this.details = details;
	}

	/** Só existe em INVALID_REQUEST. Devolve a mensagem do campo pedido, se houver. */
	issueFor(path: string): string | null {
		const issues = this.details.issues;

		if (!Array.isArray(issues)) return null;

		const found = (issues as ValidationIssue[]).find((issue) => issue.path === path);

		return found?.message ?? null;
	}
}

export function isApiError(error: unknown, code?: string): error is ApiError {
	return error instanceof ApiError && (code === undefined || error.code === code);
}

/** Mensagem pronta para a tela, venha o erro de onde vier. */
export function messageOf(error: unknown): string {
	if (error instanceof ApiError) return error.message;

	return 'Ocorreu um erro. Tente novamente.';
}

const SESSION_ENDED = new Set(['INVALID_TOKEN', 'MISSING_TOKEN']);

interface Envelope {
	error?: { code?: string; message?: string; details?: Record<string, unknown> };
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

// Token vence e não há refresh. Limpa a sessão, e a guarda de rota leva para o login.
// Operador que deixou de existir cai no mesmo caso, o token dele não serve mais.
function endSessionIfNeeded(error: ApiError, token: string | null): void {
	const sessionEnded =
		(error.status === 401 && SESSION_ENDED.has(error.code)) || error.code === 'OPERATOR_NOT_FOUND';

	if (token !== null && sessionEnded) useSession.getState().signOut();
}

export async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
	const { token } = useSession.getState();

	// Modo de demonstração. O módulo só é carregado quando a sessão é de demonstração.
	if (isDemoToken(token)) {
		const { demoRequest } = await import('@/lib/demo/server');

		try {
			return await demoRequest<T>(method, path, body, token);
		} catch (error) {
			if (error instanceof ApiError) endSessionIfNeeded(error, token);

			throw error;
		}
	}

	const headers: Record<string, string> = { Accept: 'application/json' };

	if (body !== undefined) headers['Content-Type'] = 'application/json';
	if (token !== null) headers.Authorization = `Bearer ${token}`;

	let response: Response;

	try {
		response = await fetch(`/api${path}`, {
			method,
			headers,
			body: body === undefined ? undefined : JSON.stringify(body),
			cache: 'no-store',
		});
	} catch {
		throw new ApiError(0, 'NETWORK', 'Sem conexão com o servidor. Verifique a internet e tente novamente.');
	}

	if (response.status === 204) return undefined as T;

	const payload: unknown = await response.json().catch(() => null);

	if (response.ok) return payload as T;

	const envelope = (payload as Envelope | null)?.error;

	// Sem envelope quer dizer que a resposta nem veio da API, veio do proxy.
	if (envelope?.code === undefined) {
		throw new ApiError(response.status, 'UNREACHABLE', 'Não foi possível conectar ao servidor. Tente novamente em instantes.');
	}

	const error = new ApiError(
		response.status,
		envelope.code,
		envelope.message ?? 'Ocorreu um erro.',
		envelope.details ?? {},
	);

	endSessionIfNeeded(error, token);

	throw error;
}
