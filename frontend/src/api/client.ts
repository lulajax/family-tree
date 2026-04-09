const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '/api/v1').replace(/\/$/, '');

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function apiClient<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem('auth_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) ?? {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData (browser sets multipart boundary)
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  // 15s timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiClientError(0, 'TIMEOUT', '请求超时，请重试');
    }
    throw new ApiClientError(0, 'NETWORK', '网络错误，请检查连接');
  } finally {
    clearTimeout(timeout);
  }

  // 204 No Content — success with no body
  if (res.status === 204) {
    return undefined as T;
  }

  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new ApiClientError(
      res.status,
      json.error?.code ?? 'UNKNOWN',
      json.error?.message ?? `请求失败 (${res.status})`,
    );
  }

  return json.data as T;
}

export { API_BASE };
