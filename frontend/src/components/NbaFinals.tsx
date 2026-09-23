import { useId, useRef, useState } from 'react';
import { ChevronDown, Trophy } from 'lucide-react';
import { useNba, seasonLabel } from '../hooks/useNba';
import { NbaQueryState, NbaTeamButton } from './NbaCommon';
import { formatEventCardDate } from '../helpers/eventDates';
import type { NbaEvent, NbaFinalSeries } from '../types/nba';
import type { Team } from '../types/sports';
import './seasonFinals.css';

function FinalSeries({ series, onTeam, onEvent }: { series: NbaFinalSeries; onTeam: (team: Team) => void; onEvent: (event: NbaEvent) => void }) {
  return <article className="finals-series">
      <h3>{series.label}</h3>
      {series.champion ? <div className="finals-champion"><span><Trophy size={18} aria-hidden="true" /> {series.id === 'nba' ? 'Campeão da NBA' : 'Campeão da conferência'}</span><NbaTeamButton team={series.champion} onSelect={onTeam} /></div>
        : <p className="statistics-scope">Campeão ainda não confirmado nos resultados disponíveis.</p>}
      <details className="finals-results">
        <summary>Resultados dos jogos<ChevronDown size={18} aria-hidden="true" /></summary>
      {series.games.length ? <>
        <div className="finals-series-score" aria-label="Vitórias na série">{series.teams.map((side) => <div key={side.team.id}><NbaTeamButton team={side.team} onSelect={onTeam} /><strong>{side.wins}</strong></div>)}</div>
        <p className="statistics-scope">Vitórias na série · melhor de sete. Horários de Toronto.</p>
        <ol className="finals-games">{series.games.map((game) => <li key={game.id}><button type="button" onClick={() => onEvent(game)}>
          <span className="finals-game-meta">{formatEventCardDate(game.startsAt)}</span>
          <span>{game.away.name} <strong>{game.awayScore ?? '—'} × {game.homeScore ?? '—'}</strong> {game.home.name}</span>
          <small>{game.shortStatus}</small>
        </button></li>)}</ol>
      </> : <p className="standing-empty">Jogos desta final indisponíveis.</p>}
      </details>
    </article>;
}

const conferences = [{ id: 'east', label: 'Leste' }, { id: 'west', label: 'Oeste' }];

export function NbaFinals({ year, onTeam, onEvent }: { year: number; onTeam: (team: Team) => void; onEvent: (event: NbaEvent) => void }) {
  const query = useNba<NbaFinalSeries[]>('finals', { year });
  const [selected, setSelected] = useState(0);
  const id = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const final = query.data?.find((series) => series.id === 'nba');
  return <section className="team-module season-finals" aria-label="Finais da temporada NBA">
    <header><h2><Trophy size={20} aria-hidden="true" /> Finais · {seasonLabel(year)}</h2></header>
    <NbaQueryState query={query} />
    {Boolean(query.data?.length) && <div className="finals-series-grid">
      {final ? <FinalSeries series={final} onTeam={onTeam} onEvent={onEvent} /> : <p className="standing-empty">Final da NBA indisponível.</p>}
      <section aria-label="Finais de conferência">
        <div className="nba-tabs" role="tablist" aria-label="Finais de conferência">
          {conferences.map((conference, index) => <button key={conference.id} type="button" role="tab"
            ref={(element) => { buttons.current[index] = element; }} id={`${id}-tab-${conference.id}`} aria-controls={`${id}-panel-${conference.id}`}
            aria-selected={selected === index} tabIndex={selected === index ? 0 : -1} onClick={() => setSelected(index)} onKeyDown={(event) => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
              event.preventDefault();
              const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index;
              setSelected(next);
              buttons.current[next]?.focus();
            }}>{conference.label}</button>)}
        </div>
        {conferences.map((conference, index) => {
          const series = query.data?.find((item) => item.id === conference.id);
          return <div key={conference.id} role="tabpanel" id={`${id}-panel-${conference.id}`} aria-labelledby={`${id}-tab-${conference.id}`} hidden={selected !== index}>
            {series ? <FinalSeries series={series} onTeam={onTeam} onEvent={onEvent} /> : <p className="standing-empty">Final da conferência indisponível.</p>}
          </div>;
        })}
      </section>
    </div>}
    {query.data?.length === 0 && <p className="standing-empty">Finais indisponíveis nesta temporada.</p>}
  </section>;
}
