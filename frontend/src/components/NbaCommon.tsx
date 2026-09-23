import { useRef } from 'react';
import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import type { NbaEvent, NbaStanding } from '../types/nba';
import type { Team } from '../types/sports';
import { seasonLabel } from '../hooks/useNba';
import { EventCard } from './EventCard';
import { TeamCrest } from './TeamCrest';

export function NbaQueryState({ query }: { query: Pick<UseQueryResult, 'isPending' | 'isError' | 'refetch'> }) {
  if (query.isPending) return <p role="status" className="standing-empty">Carregando dados da NBA…</p>;
  if (query.isError) return <div role="alert" className="nba-error"><p>Não foi possível carregar estes dados.</p><button onClick={() => void query.refetch()}>Tentar novamente</button></div>;
  return null;
}

export function NbaSeasons({ current, previous, onChange }: { current: number; previous: boolean; onChange: (value: boolean) => void }) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  return <div className="nba-tabs" role="tablist" aria-label="Temporada NBA">
    {[false, true].map((value, index) => <button key={String(value)} ref={(element) => { buttons.current[index] = element; }} role="tab"
      id={`nba-season-tab-${index}`} aria-controls="nba-season-panel" aria-selected={previous === value} tabIndex={previous === value ? 0 : -1}
      onClick={() => onChange(value)} onKeyDown={(event) => {
        if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index;
          onChange(next === 1); buttons.current[next]?.focus();
        }
      }}><span>{value ? 'Resumo' : 'Temporada'}</span><small>{seasonLabel(current - Number(value))}</small></button>)}
  </div>;
}

export function NbaPanel({ previous, children }: { previous: boolean; children: ReactNode }) {
  return <div id="nba-season-panel" role="tabpanel" aria-labelledby={`nba-season-tab-${Number(previous)}`}>{children}</div>;
}

export function NbaTeamButton({ team, onSelect }: { team: Team; onSelect: (team: Team) => void }) {
  return <button className="nba-team-link" onClick={() => onSelect(team)}><TeamCrest team={team} /><span>{team.name}</span></button>;
}

export function NbaCampaign({ row }: { row: NbaStanding | null }) {
  if (!row) return <p className="standing-empty">Campanha ainda não disponível nesta temporada.</p>;
  return <div className="nba-metrics">{[['Vitórias', 'wins'], ['Derrotas', 'losses'], ['Aproveitamento', 'winPercent'], ['Em casa', 'Home'], ['Fora', 'Road'], ['Últimos 10', 'Last Ten Games']].map(([label, key]) => <article key={key}><span>{label}</span><strong>{row.stats[key] ?? '—'}</strong></article>)}</div>;
}

export function NbaEvents({ events, year, onSelect }: { events: NbaEvent[]; year: number; onSelect: (event: NbaEvent) => void }) {
  return events.length ? <div className="game-list">{events.map((event) => <div key={event.id}>
    <p className="nba-game-phase">{event.seasonPhase} · {event.shortStatus}</p>
    <EventCard event={event} home={event.home} away={event.away} competition={{ id: 'nba', name: 'NBA', sport: 'basketball', season: seasonLabel(year), country: 'Estados Unidos / Canadá', color: '#ea580c' }} onSelect={() => onSelect(event)} />
  </div>)}</div> : <p className="standing-empty">Nenhuma partida disponível neste período.</p>;
}
