import { ChevronDown, Trophy } from 'lucide-react';
import { useNfl } from '../hooks/useNfl';
import { NflEvents, NflQueryState, NflSection, NflTeamButton } from './NflCommon';
import { TeamCrest } from './TeamCrest';
import { EventSummaryStats } from './DetailDialog';
import type { NflEvent, NflGame } from '../types/nfl';
import type { Team } from '../types/sports';
import './seasonFinals.css';

function SuperBowlStatistics({ event, onTeam }: { event: NflEvent; onTeam: (team: Team) => void }) {
  const query = useNfl<NflGame>('game', { id: event.id.replace('nfl-', '') });
  const data = query.data;
  const valid = data && Number(data.year) === event.seasonYear && data.teams.length === 2
    && data.teams[0].team.id === event.homeTeamId && data.teams[1].team.id === event.awayTeamId;
  const periods = Math.max(4, ...(data?.teams.map((side) => side.periods.length) ?? []));
  return <>
    <NflQueryState query={query} />
    {data && !valid && <p className="standing-empty">Estatísticas desta final indisponíveis.</p>}
    {valid && <>
      <NflSection title="Placar por quarto">
      <div className="nba-table-scroll" role="region" aria-label="Super Bowl: placar por quarto" tabIndex={0}><table className="nba-table"><thead><tr>
        <th scope="col">Equipe</th>{Array.from({ length: periods }, (_, index) => <th key={index} scope="col">{index < 4 ? `${index + 1}º Q` : `PR ${index - 3}`}</th>)}<th scope="col">Total</th>
      </tr></thead><tbody>{data.teams.map((side) => <tr key={side.team.id}>
        <th scope="row"><NflTeamButton team={side.team} onSelect={onTeam} /></th>{Array.from({ length: periods }, (_, index) => <td key={index}>{side.periods[index] ?? '—'}</td>)}<td><strong>{side.score}</strong></td>
      </tr>)}</tbody></table></div>
      </NflSection>
      <NflSection title="Estatísticas da final">
      {data.statistics.length ? <EventSummaryStats home={data.teams[0].team} away={data.teams[1].team} statistics={data.statistics} /> : <p className="standing-empty">Estatísticas coletivas indisponíveis para esta final.</p>}
      </NflSection>
    </>}
  </>;
}

export function NflSuperBowl({ year, onTeam, onEvent }: { year: number; onTeam: (team: Team) => void; onEvent: (event: NflEvent) => void }) {
  const query = useNfl<{ event: NflEvent | null }>('super-bowl', { year });
  const event = query.data?.event;
  const champion = event?.status === 'finished' && event.homeScore !== undefined && event.awayScore !== undefined && event.homeScore !== event.awayScore
    ? event.homeScore > event.awayScore ? event.home : event.away : null;
  return <details className="team-module season-finals nfl-section nfl-super-bowl" aria-label="Super Bowl da temporada anterior" open>
    <summary>
      <span className="super-bowl-summary">
        <span className="super-bowl-title"><Trophy size={20} aria-hidden="true" /> Super Bowl · Temporada {year}</span>
        {champion ? <span className="finals-champion super-bowl-champion"><span>Campeão do Super Bowl</span><span><TeamCrest team={champion} />{champion.name}</span></span>
          : <span className="statistics-scope">{query.isPending ? 'Carregando campeão…' : 'Campeão ainda não confirmado.'}</span>}
      </span>
      <ChevronDown size={20} aria-hidden="true" />
    </summary>
    <div className="nfl-section-body">
    <NflQueryState query={query} />
    {query.data && !event && <p className="standing-empty">Super Bowl indisponível nesta temporada.</p>}
    {event && <>
      <NflEvents events={[event]} onSelect={onEvent} showPhase={false} />
      <SuperBowlStatistics event={event} onTeam={onTeam} />
    </>}
    </div>
  </details>;
}
