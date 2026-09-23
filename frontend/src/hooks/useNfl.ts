import { useQuery } from '@tanstack/react-query';
import type { NflSeason } from '../types/nfl';

export function useNfl<T>(type: string, params: Record<string, string | number> = {}, enabled = true, live = false) {
  return useQuery<T>({
    queryKey: ['nfl', type, params], enabled,
    queryFn: async ({ signal }) => {
      const url = new URL(import.meta.env.VITE_SPORTS_API_BASE_URL || '/api/sports', window.location.origin);
      url.searchParams.set('type', `nfl-${type}`);
      for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
      const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(30000)]) });
      if (!response.ok) throw new Error('Não foi possível carregar os dados da NFL.');
      return await response.json() as T;
    },
    staleTime: 60000, retry: 1, refetchInterval: live ? 60000 : false,
  });
}
export function useNflSeason() { return useNfl<NflSeason>('season'); }
