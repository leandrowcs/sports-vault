import { useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { shiftCalendarDate } from '../helpers/homeSchedule';
import { useNba, useNbaSeason, seasonLabel } from '../hooks/useNba';
import { NbaEvents, NbaPanel, NbaQueryState, NbaSeasons, NbaTeamButton } from '../components/NbaCommon';
import type { NbaConference, NbaEvent } from '../types/nba';
import type { Team } from '../types/sports';
import { eventDateKey, eventTimeZoneLabel } from '../helpers/eventDates';
import { overallStandings } from '../helpers/nbaStandings';
import { NbaFinals } from '../components/NbaFinals';
import './nba.css';

const columns = [['V', 'wins'], ['D', 'losses'], ['PCT', 'winPercent'], ['GB', 'gamesBehind'], ['Casa', 'Home'], ['Fora', 'Road'], ['Últ. 10', 'Last Ten Games'], ['Seq.', 'streak'], ['PF/J', 'avgPointsFor'], ['PC/J', 'avgPointsAgainst']];
const standingTabs = ['Conferência Leste', 'Conferência Oeste', 'Classificação Geral'];

function NbaSeasonContent({ year, previous, onTeam, onEvent }: { year: number; previous: boolean; onTeam: (team: Team) => void; onEvent: (event: NbaEvent) => void }) {
  const [selectedDate, setDate] = useState<string | null>(null);
  const lastGame = useNba<{ date: string | null }>('last-game', { year }, previous);
  const date = selectedDate ?? (previous ? lastGame.data?.date ?? '' : eventDateKey());
  const standings = useNba<NbaConference[]>('standings', { year });
  const [standingTab, setStandingTab] = useState(0);
  const tabButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const rows = standingTab === 2 ? overallStandings(standings.data ?? []) : standings.data?.find((group) => group.name === (standingTab === 0 ? 'Leste' : 'Oeste'))?.rows ?? [];
  const calendar = useNba<NbaEvent[]>('calendar', { year, date }, Boolean(date), !previous);
  const [standingsOpen, setStandingsOpen] = useState(true);
  const minDate = `${year - 1}-09-01`;
  const maxDate = previous ? lastGame.data?.date ?? `${year}-09-30` : `${year}-09-30`;
  return <>
    {previous && <NbaFinals year={year} onTeam={onTeam} onEvent={onEvent} />}
    <section className="team-module">
      <header><h2><button type="button" className="schedule-toggle" aria-expanded={standingsOpen} aria-controls={`standings-body-${year}`} onClick={() => setStandingsOpen((value) => !value)}><span>{previous ? 'Resumo' : 'Classificação'} · {seasonLabel(year)}</span><ChevronDown size={18} aria-hidden="true" /></button></h2></header>
      <div id={`standings-body-${year}`} hidden={!standingsOpen}>
      <p className="statistics-scope">Temporada regular · Classificação fornecida pela ESPN. PCT: aproveitamento; GB: jogos atrás; PF/PC: pontos feitos/sofridos por jogo.</p>
      <div className="nba-tabs nba-standings-tabs" role="tablist" aria-label="Classificação NBA">
        {standingTabs.map((label, index) => <button key={label} ref={(element) => { tabButtons.current[index] = element; }} role="tab" id={`standings-tab-${year}-${index}`} aria-controls={`standings-panel-${year}`} aria-selected={standingTab === index} tabIndex={standingTab === index ? 0 : -1} onClick={() => setStandingTab(index)} onKeyDown={(event) => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
          setStandingTab(next); tabButtons.current[next]?.focus();
        }}>{label}</button>)}
      </div>
      <div role="tabpanel" id={`standings-panel-${year}`} aria-labelledby={`standings-tab-${year}-${standingTab}`}>
        <NbaQueryState query={standings} />
        {standingTab === 2 && <p className="statistics-scope">Leste e Oeste combinados por aproveitamento e vitórias. Campanhas iguais compartilham a posição; GB é relativo ao líder geral. Não aplica os critérios oficiais de desempate dos playoffs.</p>}
        {standings.data && !rows.length && <p className="standing-empty">A classificação ainda não foi publicada para esta temporada.</p>}
        {previous && rows[0] && <p className="statistics-scope">Melhor campanha: {rows[0].team.name} · {rows[0].stats.wins ?? '—'} vitórias e {rows[0].stats.losses ?? '—'} derrotas.</p>}
        {rows.length > 0 && <div key={standingTab} className="nba-table-scroll" role="region" aria-label={standingTabs[standingTab]} tabIndex={0}><table className="nba-table nba-standings-table">
          <thead><tr><th scope="col" className="nba-position-column">#</th><th scope="col" className="nba-team-column">Equipe</th>{columns.map(([label, key]) => <th scope="col" key={key}>{label}</th>)}</tr></thead>
          <tbody>{rows.map((row) => <tr key={row.team.id}><td className="nba-position-column">{row.position}</td><th scope="row" className="nba-team-column"><NbaTeamButton team={row.team} onSelect={onTeam} /></th>{columns.map(([, key]) => <td key={key}>{row.stats[key] ?? '—'}</td>)}</tr>)}</tbody>
        </table></div>}
      </div>
      </div>
    </section>
    <section className="team-module">
      <header><h2>{previous ? 'Resultados da temporada anterior' : 'Calendário e placares'}</h2></header>
      {previous && !selectedDate && <NbaQueryState query={lastGame} />}
      {previous && lastGame.data?.date === null && <p className="standing-empty">Nenhum jogo concluído disponível nesta temporada.</p>}
      <div className="nba-date-nav">
        <button type="button" className="nba-date-step" aria-label="Dia anterior" disabled={!date || date <= minDate} onClick={() => setDate(shiftCalendarDate(date, -1))}><ChevronLeft size={18} aria-hidden="true" /></button>
        <label className="nba-date">Data dos jogos<input type="date" value={date} min={minDate} max={maxDate} onChange={(event) => { if (event.target.value) setDate(event.target.value); }} /></label>
        <button type="button" className="nba-date-step" aria-label="Próximo dia" disabled={!date || date >= maxDate} onClick={() => setDate(shiftCalendarDate(date, 1))}><ChevronRight size={18} aria-hidden="true" /></button>
      </div>
      {date && <p className="statistics-scope">{eventTimeZoneLabel(new Date(`${date}T12:00:00Z`))}. Apenas jogos da temporada {seasonLabel(year)}. {previous ? '' : 'Atualização automática a cada minuto.'}</p>}
      {date && <NbaQueryState query={calendar} />}
      {calendar.data && <NbaEvents events={calendar.data} year={year} onSelect={onEvent} />}
    </section>
  </>;
}

export function NbaPage({ onTeam, onEvent }: { onTeam: (team: Team) => void; onEvent: (event: NbaEvent) => void }) {
  const season = useNbaSeason();
  const teams = useNba<{ name: string; teams: Team[] }[]>('team-conferences');
  const [conference, setConference] = useState('Leste');
  const [previous, setPrevious] = useState(false);
  return <section className="nba-page nba-league-page" data-sport="nba" aria-label="NBA">
    <NbaQueryState query={season} />
    {season.data && <>
      <NbaSeasons current={season.data.year} previous={previous} onChange={setPrevious} />
      <NbaPanel previous={previous}><NbaSeasonContent key={season.data.year - Number(previous)} year={season.data.year - Number(previous)} previous={previous} onTeam={onTeam} onEvent={onEvent} /></NbaPanel>
    </>}
    <details className="team-module nba-conference" open><summary className="nba-conference-toggle"><h2>Equipes da NBA</h2><ChevronDown size={20} aria-hidden="true" /></summary>
      <div className="competition-filters nba-team-filters" aria-label="Filtrar equipes por conferência">{['Leste', 'Oeste'].map((name) => <button key={name} aria-pressed={conference === name} onClick={() => setConference(name)}>{name}</button>)}</div>
      <NbaQueryState query={teams} />
      {teams.data && <div className="nba-roster">{teams.data.find((group) => group.name === conference)?.teams.map((team) => <NbaTeamButton key={team.id} team={team} onSelect={onTeam} />)}</div>}
      {teams.data && !teams.data.find((group) => group.name === conference)?.teams.length && <p className="standing-empty">Equipes indisponíveis nesta conferência.</p>}
    </details>
  </section>;
}
