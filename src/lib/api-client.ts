import { ApiResponse } from "../../shared/types"

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  // Extract any user‑provided headers from `init` and keep the rest of the init options
  const { headers: initHeaders, ...restInit } = init ?? {};

  // Start with the required default header
  const headers = new Headers({ 'Content-Type': 'application/json' });

  // Merge user‑provided headers (if any) without losing them
  if (initHeaders) {
    new Headers(initHeaders).forEach((value, key) => {
      headers.set(key, value);
    });
  }

  // In a browser environment, add the Authorization header from localStorage
  // only if a token exists and the caller hasn't already set Authorization.
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  // Perform the request with the fully merged headers and the remaining init options
  const res = await fetch(path, { headers, ...restInit })
  const json = (await res.json()) as ApiResponse<T>
  if (!res.ok || !json.success || json.data === undefined) throw new Error(json.error || 'Request failed')
  return json.data
}