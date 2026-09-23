import { useQuery } from '@tanstack/react-query';
import type { NbaSeason } from '../types/nba';

export function useNba<T>(type: string, params: Record<string, string | number> = {}, enabled = true, live = false) {
  return useQuery<T>({
    queryKey: ['nba', type, params],
    enabled,
    queryFn: async ({ signal }) => {
      const url = new URL(import.meta.env.VITE_SPORTS_API_BASE_URL || '/api/sports', window.location.origin);
      url.searchParams.set('type', `nba-${type}`);
      for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
      const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(25000)]) });
      if (!response.ok) throw new Error('Não foi possível carregar os dados da NBA.');
      return await response.json() as T;
    },
    staleTime: 60000,
    retry: 1,
    refetchInterval: live ? 60000 : false,
  });
}

export function useNbaSeason() { return useNba<NbaSeason>('season'); }
export function seasonLabel(year: number) { return `${year - 1}/${String(year).slice(-2)}`; }
