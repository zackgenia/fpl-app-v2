const API_BASE = '/api/fpl';

const cache = new Map<string, unknown>();

async function fetchFpl<T>(endpoint: string, cacheKey: string): Promise<T> {
  if (cache.has(cacheKey)) return cache.get(cacheKey) as T;
  const response = await fetch(`${API_BASE}${endpoint}`);
  if (!response.ok) {
    throw new Error(`FPL proxy error (${response.status})`);
  }
  const data = await response.json();
  cache.set(cacheKey, data);
  return data as T;
}

export async function getFplBootstrap(): Promise<unknown> {
  return fetchFpl('/bootstrap', 'bootstrap');
}

export async function getFplFixtures(): Promise<unknown> {
  return fetchFpl('/fixtures', 'fixtures');
}

export async function getFplLive(gw: number): Promise<unknown> {
  return fetchFpl(`/event/${gw}/live`, `live:${gw}`);
}

export async function getFplElementSummary(id: number): Promise<unknown> {
  return fetchFpl(`/element/${id}/summary`, `summary:${id}`);
}
