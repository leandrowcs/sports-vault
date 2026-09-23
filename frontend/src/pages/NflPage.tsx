import { useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNfl, useNflSeason } from '../hooks/useNfl';
import { NflConferenceLogo, NflEvents, NflQueryState, NflSection, NflTabs, NflTeamButton } from '../components/NflCommon';
import { NflSuperBowl } from '../components/NflSuperBowl';
import type { NflDivision, NflEvent, NflPhase, NflSeason } from '../types/nfl';
import type { Team } from '../types/sports';
import './nba.css';
import './nfl.css';

const columns = [['V', 'wins'], ['D', 'losses'], ['E', 'ties'], ['PCT', 'winPercent'], ['PF', 'pointsFor'], ['PC', 'pointsAgainst'], ['Saldo', 'pointDifferential'], ['Casa', 'Home'], ['Fora', 'Road'], ['Divisão', 'vs. Div.'], ['Conferência', 'vs. Conf.'], ['Seq.', 'streak']];

export function NflSchedule({ year, season, onEvent }: { year: number; season: NflSeason; onEvent: (event: NflEvent) => void }) {
  const calendar = useNfl<NflPhase[]>('calendar', { year });
  const [selection, setSelection] = useState<{ phase: number; week: number } | null>(null);
  const initialPhase = year === season.year && season.phase <= 3 ? season.phase : 2;
  const phase = selection?.phase ?? initialPhase;
  const weeks = calendar.data?.find((p) => p.phase === phase)?.weeks ?? [];
  const requestedWeek = selection?.week ?? (year === season.year && phase === season.phase ? season.week : 1);
  const week = weeks.some((w) => w.number === requestedWeek) ? requestedWeek : weeks[0]?.number ?? 1;
  const weekIndex = weeks.findIndex((w) => w.number === week);
  const query = useNfl<NflEvent[]>('week', { year, phase, week }, weeks.length > 0, year === season.year);
  return <NflSection title="Agenda semanal e placares" open>
    <NflQueryState query={calendar} />
    {calendar.data && <>
      <header className="nfl-schedule-header">
      <div className="nfl-selectors"><label>Fase<select value={phase} onChange={(e) => setSelection({ phase: Number(e.target.value), week: 1 })}>{calendar.data.map((p) => <option key={p.phase} value={p.phase}>{p.label}</option>)}</select></label>
      </div>
      {weeks.length > 0 && <nav className="nfl-week-pagination" aria-label="Navegar pelas semanas da NFL">
        <button type="button" aria-label="Semana anterior" disabled={weekIndex <= 0} onClick={() => { const previous = weeks[weekIndex - 1]; if (previous) setSelection({ phase, week: previous.number }); }}><ChevronLeft size={20} aria-hidden="true" /><span>Anterior</span></button>
        <div aria-live="polite" aria-atomic="true"><strong>{weeks[weekIndex]?.label}</strong><small>{weekIndex + 1} de {weeks.length}</small></div>
        <button type="button" aria-label="Próxima semana" disabled={weekIndex >= weeks.length - 1} onClick={() => { const next = weeks[weekIndex + 1]; if (next) setSelection({ phase, week: next.number }); }}><span>Próxima</span><ChevronRight size={20} aria-hidden="true" /></button>
      </nav>}
      <p className="statistics-scope">Horários de Toronto (EST/EDT). {year === season.year ? 'Atualização automática a cada minuto.' : ''}</p>
      </header>
      {weeks.length ? <><NflQueryState query={query} />{query.data && <NflEvents events={query.data} onSelect={onEvent} showPhase={false} />}</> : <p className="standing-empty">Calendário ainda indisponível.</p>}
    </>}
  </NflSection>;
}

function SeasonContent({ year, season, onTeam, onEvent }: { year: number; season: NflSeason; onTeam: (team: Team) => void; onEvent: (event: NflEvent) => void }) {
  const query = useNfl<NflDivision[]>('standings', { year }, true, year === season.year);
  const [conference, setConference] = useState(0);
  const [selectedDivisions, setSelectedDivisions] = useState<Record<string, string>>({});
  const selected = ['AFC', 'NFC'][conference];
  const divisions = query.data?.filter((d) => d.conference === selected) ?? [];
  const divisionIndex = Math.max(0, divisions.findIndex((division) => division.name === selectedDivisions[selected]));
  const division = divisions[divisionIndex];
  return <>
    {year < season.year && <NflSuperBowl year={year} onTeam={onTeam} onEvent={onEvent} />}
    <section className="team-module"><header><h2>Classificação por divisão · {year}</h2></header>
      <p className="statistics-scope">Temporada regular · ESPN. V/D/E: vitórias, derrotas e empates; PCT: aproveitamento; PF/PC: pontos feitos/sofridos. Seed: posição na conferência fornecida pela ESPN.</p>
      <NflTabs label="Conferências NFL" labels={['AFC', 'NFC'].map((name) => <><NflConferenceLogo name={name} />{name}</>)} selected={conference} onChange={setConference}>
        <NflQueryState query={query} />
        {query.data && !divisions.length && <p className="standing-empty">Classificação indisponível.</p>}
        {division && <NflTabs label={`Divisões da ${selected}`} labels={divisions.map((item) => <>{item.logoUrl && <img className="nfl-conference-logo" src={item.logoUrl} alt="" />}{item.name.replace(`${selected} `, '')}</>)} selected={divisionIndex}
          onChange={(index) => setSelectedDivisions((current) => ({ ...current, [selected]: divisions[index].name }))}>
          {division.rows.length ? <div className="nba-table-scroll" role="region" aria-label={division.name} tabIndex={0}><table className="nba-table nba-standings-table"><thead><tr><th scope="col" className="nba-team-column">Equipe</th><th scope="col">Seed</th>{columns.map(([label, key]) => <th scope="col" key={key}>{label}</th>)}</tr></thead>
            <tbody>{division.rows.map((row) => <tr key={row.team.id}><th scope="row" className="nba-team-column"><NflTeamButton team={row.team} onSelect={onTeam} /></th><td>{row.seed ?? '—'}</td>{columns.map(([, key]) => <td key={key}>{row.stats[key] ?? '—'}</td>)}</tr>)}</tbody></table></div>
            : <><p className="standing-empty">Campanhas ainda não publicadas.</p><div className="nba-roster">{division.teams.map((team) => <NflTeamButton key={team.id} team={team} onSelect={onTeam} />)}</div></>}
        </NflTabs>}
      </NflTabs>
    </section>
    <NflSchedule year={year} season={season} onEvent={onEvent} />
  </>;
}

export function NflPage({ onTeam, onEvent }: { onTeam: (team: Team) => void; onEvent: (event: NflEvent) => void }) {
  const season = useNflSeason();
  const [previous, setPrevious] = useState(0);
  const seasonTabs = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const tabs = seasonTabs.current;
    if (!tabs) return;
    const updateHeight = () => tabs.parentElement?.style.setProperty('--nfl-season-tabs-height', `${tabs.getBoundingClientRect().height}px`);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(tabs);
    return () => observer.disconnect();
  }, [season.data]);
  return <section className="nba-page nfl-page" data-sport="nfl" aria-label="NFL"><NflQueryState query={season} />
    {season.data && <NflTabs tabListRef={seasonTabs} label="Temporada NFL" labels={[`Temporada ${season.data.year}`, `Resumo ${season.data.year - 1}`]} selected={previous} onChange={setPrevious}>
      <SeasonContent key={season.data.year - previous} year={season.data.year - previous} season={season.data} onTeam={onTeam} onEvent={onEvent} />
    </NflTabs>}
  </section>;
}
