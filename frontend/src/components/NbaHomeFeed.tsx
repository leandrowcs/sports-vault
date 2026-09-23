import { ChevronDown } from 'lucide-react';
import { useNba, useNbaSeason, seasonLabel } from '../hooks/useNba';
import { currentWeekStart, eventDay, groupSchedule, shiftCalendarDate } from '../helpers/homeSchedule';
import { eventDateKey, eventTimeZoneLabel } from '../helpers/eventDates';
import type { NbaConference, NbaEvent } from '../types/nba';
import type { SportEvent } from '../types/sports';
import { NbaEvents, NbaQueryState } from './NbaCommon';
import { TeamCrest } from './TeamCrest';
import '../pages/nba.css';

function Week({ start, year, next, onSelectEvent }: { start: string; year: number; next: boolean; onSelectEvent: (event: SportEvent) => void }) {
  const query = useNba<NbaEvent[]>('week', { year, date: start }, true, true);
  const end = shiftCalendarDate(start, 6);
  const games = (query.data ?? []).filter((event) => {
    const day = eventDateKey(new Date(event.startsAt));
    return day >= start && day <= end;
  });
  const range = `${eventDay({ startsAt: `${start}T12:00:00Z` })} a ${eventDay({ startsAt: `${end}T12:00:00Z` })}`;
  return <details className="nba-home-week schedule-group" open={!next}>
    <summary className="schedule-toggle"><span>{next ? 'Próxima semana' : 'Semana atual'} · {range}</span><span className="schedule-count">{query.data ? `${games.length} jogos` : '…'}</span><ChevronDown size={18} aria-hidden="true" /></summary>
    <div className="schedule-content">
      <NbaQueryState query={query} />
      {query.data && games.length === 0 && <p className="statistics-scope">Nenhum jogo da temporada disponível nesta semana.</p>}
      {groupSchedule(games, eventDay).map(([day, events]) => <section className="schedule-day" key={day}>
        <h3>{day} <small>{eventTimeZoneLabel(new Date(events[0].startsAt))}</small></h3>
        <NbaEvents events={events} year={year} onSelect={onSelectEvent} />
      </section>)}
    </div>
  </details>;
}

function SeasonFeed({ year, onSelectEvent, onViewStandings }: { year: number; onSelectEvent: (event: SportEvent) => void; onViewStandings: () => void }) {
  const standings = useNba<NbaConference[]>('standings', { year });
  const start = currentWeekStart();
  return <>
    <section className="team-module nba-home-standings" aria-label="Resumo da classificação NBA">
      <header><h2>Classificação · {seasonLabel(year)}</h2></header>
      <p className="statistics-scope">Os 4 primeiros de cada conferência · Temporada regular</p>
      <NbaQueryState query={standings} />
      {standings.data && !standings.data.some((group) => group.rows.length) && <p className="standing-empty">A classificação ainda não foi publicada para esta temporada.</p>}
      <div className="nba-top-conferences">{standings.data?.filter((group) => group.rows.length).map((group) => <section key={group.name}><h3>{group.name}</h3>
        <table className="nba-table"><thead><tr><th scope="col">#</th><th scope="col">Equipe</th><th scope="col">V</th><th scope="col">D</th></tr></thead>
          <tbody>{group.rows.slice(0, 4).map((row) => <tr key={row.team.id}><td>{row.position}</td><th scope="row"><div className="nba-top-team"><TeamCrest team={row.team} /><span>{row.team.name}</span></div></th><td>{row.stats.wins ?? '—'}</td><td>{row.stats.losses ?? '—'}</td></tr>)}</tbody>
        </table>
      </section>)}</div>
      <button className="nba-more" onClick={onViewStandings}>Ver classificação completa</button>
    </section>
    <div className="vault-feed-section-heading"><h2>Jogos da semana</h2></div>
    <div className="schedule-groups"><Week key={start} year={year} start={start} next={false} onSelectEvent={onSelectEvent} /><Week key={shiftCalendarDate(start, 7)} year={year} start={shiftCalendarDate(start, 7)} next onSelectEvent={onSelectEvent} /></div>
  </>;
}

export function NbaHomeFeed({ onSelectEvent, onViewStandings }: { onSelectEvent: (event: SportEvent) => void; onViewStandings: () => void }) {
  const season = useNbaSeason();
  return <div data-sport="nba"><NbaQueryState query={season} />{season.data && <SeasonFeed year={season.data.year} onSelectEvent={onSelectEvent} onViewStandings={onViewStandings} />}</div>;
}
