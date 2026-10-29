export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch('/api' + path, {
    credentials: 'include',
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const type = response.headers.get('content-type') || '';
  const data = type.includes('application/json') ? await response.json() : await response.text();
  if (response.status === 401 && !path.startsWith('/auth/'))
    window.dispatchEvent(new Event('ifca-unauthorized'));
  if (!response.ok)
    throw new Error(
      typeof data === 'string'
        ? 'Request failed. Check that the backend is running.'
        : data.error?.message || 'Request failed',
    );
  return data as T;
}
export function json(method: string, body?: unknown): RequestInit {
  return { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) };
}
export function download(text: string, name: string, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type })),
    link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
