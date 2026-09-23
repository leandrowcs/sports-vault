import { useId, useRef, type ReactNode, type Ref } from 'react';
import { ChevronDown } from 'lucide-react';
import type { UseQueryResult } from '@tanstack/react-query';
import { TeamCrest } from './TeamCrest';
import { EventCard } from './EventCard';
import type { NflEvent } from '../types/nfl';
import type { Team } from '../types/sports';

export function NflQueryState({ query }: { query: Pick<UseQueryResult, 'isPending' | 'isError' | 'refetch'> }) {
  if (query.isPending) return <p role="status" className="standing-empty">Carregando NFL…</p>;
  if (query.isError) return <div role="alert" className="nba-error"><p>Não foi possível carregar estes dados.</p><button onClick={() => void query.refetch()}>Tentar novamente</button></div>;
  return null;
}

export function NflTabs({ labels, selected, onChange, label, children, tabListRef }: { labels: ReactNode[]; selected: number; onChange: (index: number) => void; label: string; children: ReactNode; tabListRef?: Ref<HTMLDivElement> }) {
  const id = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  return <><div ref={tabListRef} className="nba-tabs nfl-tabs" role="tablist" aria-label={label}>{labels.map((text, index) => <button key={index}
    ref={(element) => { buttons.current[index] = element; }} role="tab" id={`${id}-tab-${index}`} aria-controls={`${id}-panel`}
    aria-selected={selected === index} tabIndex={selected === index ? 0 : -1} onClick={() => onChange(index)} onKeyDown={(event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? labels.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : labels.length - 1)) % labels.length;
      onChange(next); buttons.current[next]?.focus();
    }}>{text}</button>)}</div><div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${selected}`}>{children}</div></>;
}

export function NflSection({ title, children, open = false }: { title: ReactNode; children: ReactNode; open?: boolean }) {
  return <details className="team-module nfl-section" open={open}><summary><span>{title}</span><ChevronDown size={19} aria-hidden="true" /></summary><div className="nfl-section-body">{children}</div></details>;
}

export function NflConferenceLogo({ name }: { name: string }) {
  return <img className="nfl-conference-logo" src={`/conferences/${name.toLowerCase()}.png`} alt="" onError={(e) => { e.currentTarget.hidden = true; }} />;
}

export function NflTeamButton({ team, onSelect }: { team: Team; onSelect: (team: Team) => void }) {
  return <button className="nba-team-link" onClick={() => onSelect(team)}><TeamCrest team={team} /><span>{team.name}</span></button>;
}

export function NflEvents({ events, onSelect, showPhase = true }: { events: NflEvent[]; onSelect: (event: NflEvent) => void; showPhase?: boolean }) {
  return events.length ? <div className="game-list">{events.map((event) => <div key={event.id}>
    {showPhase && <p className="nba-game-phase">{event.seasonPhase}{event.week ? ` · Semana ${event.week}` : ''} · {event.shortStatus}</p>}
    <EventCard event={event} home={event.home} away={event.away} competition={{ id: 'nfl', name: 'NFL', sport: 'american_football', season: String(event.seasonYear), country: 'Estados Unidos', color: '#7c2d12' }} onSelect={() => onSelect(event)} />
  </div>)}</div> : <p className="standing-empty">Nenhuma partida disponível neste período.</p>;
}
