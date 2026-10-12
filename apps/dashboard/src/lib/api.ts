/**
 * Authenticated fetch for merchant API calls.
 *
 * The bearer-token-or-cookie dance was being copy-pasted into every view
 * (App.tsx, SuperAdminView, SuperPackagesView, SuperPaidUsersView,
 * OnboardingModal). This centralises it so the theme editor's dozen endpoints
 * do not add a dozen more copies.
 */

export function getAuthToken(): string | null {
  try {
    return (
      localStorage.getItem("gocom_session_token") ||
      localStorage.getItem("gocom_auth_token") ||
      sessionStorage.getItem("gocom_token")
    );
  } catch {
    return null;
  }
}

export interface ApiError extends Error {
  status: number;
  /** RFC 9457 problem document the API returned, when it returned one. */
  problem?: any;
}

function toApiError(status: number, problem: any): ApiError {
  const detail =
    problem?.detail ||
    problem?.title ||
    problem?.message ||
    `Request failed with HTTP ${status}`;
  const err = new Error(detail) as ApiError;
  err.status = status;
  err.problem = problem;
  return err;
}

/**
 * Calls the merchant API and returns parsed JSON. Throws an `ApiError`
 * carrying the RFC 9457 problem document on a non-2xx response, so callers can
 * surface the server's own Bangla message rather than inventing one.
 */
export async function apiFetch<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(init.body ? { "Content-Type": "application/json" } : {}),
    ...((init.headers as Record<string, string>) ?? {}),
  };

  const token = getAuthToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(path, { ...init, headers, credentials: "include" });
  const payload = await res.json().catch(() => null);

  if (!res.ok) throw toApiError(res.status, payload);
  return payload as T;
}

/** `apiFetch` with a JSON body, for the common POST/PUT case. */
export function apiPost<T = any>(path: string, body: unknown, method = "POST"): Promise<T> {
  return apiFetch<T>(path, { method, body: JSON.stringify(body) });
}
