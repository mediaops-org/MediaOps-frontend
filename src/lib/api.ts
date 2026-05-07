const BASE = (import.meta.env.VITE_API_URL as string) || '';

export async function apiFetch(input: RequestInfo, init?: RequestInit) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = new Headers(init?.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let url: RequestInfo = input;
  if (typeof input === 'string' && input.startsWith('/api')) {
    url = `${BASE}${input}`;
  }

  return fetch(url, { ...init, headers });
}

export default apiFetch;
