import { useState } from "react";
import { Trophy } from "lucide-react";
import { FOCUS_GROUPS, getFocusGroup, isBrazilEvent, leaguesForFocusGroup } from "../helpers/focusGroups";
import { teamMetrics } from "../helpers/sportStatistics";
import { EventCard } from "../components/EventCard";
import type { FocusGroupId, League, SportEvent, Team } from "../types/sports";

export function CompetitionsPage({
  events,
  leagues,
  teams,
  getTeam,
  getLeague,
  onSelectEvent,
}: {
  events: SportEvent[];
  leagues: League[];
  teams: Team[];
  getTeam: (id: string) => Team;
  getLeague: (id: string) => League;
  onSelectEvent: (event: SportEvent) => void;
}) {
  const availableGroups = FOCUS_GROUPS.filter((group) => leagues.some((league) => getFocusGroup(league) === group.id));
  const [activeGroup, setActiveGroup] = useState<FocusGroupId>(availableGroups[0]?.id ?? "futebol");
  const groupLeagues = leaguesForFocusGroup(leagues, activeGroup);
  const [activeLeagueId, setActiveLeagueId] = useState<string | null>(null);
  const selectedLeagues = activeLeagueId ? groupLeagues.filter((league) => league.id === activeLeagueId) : groupLeagues;
  const leagueIds = new Set(selectedLeagues.map((league) => league.id));

  const scopedEvents = events
    .filter((event) => leagueIds.has(event.leagueId))
    .filter((event) => activeGroup !== "selecao" || isBrazilEvent(event, getTeam));
  const liveAndUpcoming = scopedEvents
    .filter((event) => event.status !== "finished")
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const recentResults = scopedEvents
    .filter((event) => event.status === "finished")
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));

  const standings = activeGroup === "selecao"
    ? []
    : teams
      .filter((team) => leagueIds.has(team.leagueId))
      .map((team) => {
        const league = getLeague(team.leagueId);
        const metrics = teamMetrics(league.sport, team, scopedEvents);
        const games = metrics.find((metric) => metric.key === "games")?.value ?? 0;
        const wins = metrics.find((metric) => metric.key === "wins")?.value ?? 0;
        const losses = metrics.find((metric) => metric.key === "losses")?.value ?? 0;
        const draws = metrics.find((metric) => metric.key === "draws" || metric.key === "ties")?.value ?? 0;
        const diff = metrics.find((metric) => metric.key === "goalDifference" || metric.key === "pointDifference")?.value ?? 0;
        return { team, league, games, wins, losses, draws, diff };
      })
      .filter((row) => row.games > 0)
      .sort((a, b) => b.wins - a.wins || b.diff - a.diff);

  function selectGroup(group: FocusGroupId) {
    setActiveGroup(group);
    setActiveLeagueId(null);
  }

  return (
    <section aria-label="Competições" className="competitions-page">
      <div className="page-intro">
        <h2>Competições</h2>
        <p>Classificação, jogos da rodada e próxima rodada por competição.</p>
      </div>
      <nav className="competition-filters" aria-label="Filtrar por foco">
        {availableGroups.map((group) => (
          <button key={group.id} aria-pressed={activeGroup === group.id} onClick={() => selectGroup(group.id)}>
            {group.label}
          </button>
        ))}
      </nav>
      {groupLeagues.length > 1 && (
        <nav className="competition-filters" aria-label="Filtrar por competição">
          <button aria-pressed={activeLeagueId === null} onClick={() => setActiveLeagueId(null)}>Todas</button>
          {groupLeagues.map((league) => (
            <button key={league.id} aria-pressed={activeLeagueId === league.id} onClick={() => setActiveLeagueId(league.id)}>{league.name}</button>
          ))}
        </nav>
      )}

      {standings.length > 0 && (
        <section className="team-module">
          <header>
            <h2>Classificação</h2>
          </header>
          <p className="statistics-scope">Calculada a partir dos jogos concluídos carregados; não representa a tabela oficial da temporada.</p>
          <div className="standings-table">
            {standings.map((row, index) => (
              <div className="standing-row" key={row.team.id}>
                <span>{index + 1}</span>
                <b>{row.team.name}</b>
                <small>{row.games}J</small>
                <small>{row.wins}V {row.draws}E {row.losses}D</small>
                <strong>{row.diff > 0 ? `+${row.diff}` : row.diff}</strong>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="team-module">
        <header>
          <h2>Rodada atual e próxima</h2>
        </header>
        {liveAndUpcoming.length ? (
          <div className="game-list">
            {liveAndUpcoming.map((event) => (
              <EventCard key={event.id} event={event} home={getTeam(event.homeTeamId)} away={getTeam(event.awayTeamId)} competition={getLeague(event.leagueId)} onSelect={onSelectEvent} />
            ))}
          </div>
        ) : (
          <p className="standing-empty">Nenhum jogo agendado no recorte carregado.</p>
        )}
      </section>

      <section className="team-module">
        <header>
          <h2>Últimos resultados</h2>
        </header>
        {recentResults.length ? (
          <div className="game-list">
            {recentResults.map((event) => (
              <EventCard key={event.id} event={event} home={getTeam(event.homeTeamId)} away={getTeam(event.awayTeamId)} competition={getLeague(event.leagueId)} onSelect={onSelectEvent} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Trophy size={25} />
            <h3>Nenhum resultado disponível.</h3>
          </div>
        )}
      </section>
    </section>
  );
}
