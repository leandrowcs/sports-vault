import { useId, useRef, useState } from "react";
import { Trophy } from "lucide-react";
import { FOCUS_GROUPS, isBrazilEvent, leaguesForFocusGroup } from "../helpers/focusGroups";
import { teamMetrics } from "../helpers/sportStatistics";
import { EventCard } from "../components/EventCard";
import type { FocusGroupId, League, SportEvent, Team } from "../types/sports";

export function CompetitionsPage({
  focusGroup,
  events,
  leagues,
  teams,
  getTeam,
  getLeague,
  onSelectEvent,
}: {
  focusGroup: FocusGroupId;
  events: SportEvent[];
  leagues: League[];
  teams: Team[];
  getTeam: (id: string) => Team;
  getLeague: (id: string) => League;
  onSelectEvent: (event: SportEvent) => void;
}) {
  const groupLeagues = leaguesForFocusGroup(leagues, focusGroup)
    .filter((league) => league.id !== "brasileirao-c" && league.id !== "brasileirao-d");
  const [selection, setSelection] = useState<{ group: FocusGroupId; leagueId: string | null }>({ group: focusGroup, leagueId: null });
  const activeLeagueId = selection.group === focusGroup && groupLeagues.some((league) => league.id === selection.leagueId)
    ? selection.leagueId
    : null;
  const setActiveLeagueId = (leagueId: string | null) => setSelection({ group: focusGroup, leagueId });
  const tabId = useId();
  const tabButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const tabs = [{ leagueId: null, label: "Todas" }, ...groupLeagues.map((league) => ({ leagueId: league.id, label: league.name }))];
  const selectedTabIndex = Math.max(0, tabs.findIndex((tab) => tab.leagueId === activeLeagueId));
  const hasTabs = groupLeagues.length > 1;
  const selectedLeagues = activeLeagueId ? groupLeagues.filter((league) => league.id === activeLeagueId) : groupLeagues;
  const leagueIds = new Set(selectedLeagues.map((league) => league.id));

  const scopedEvents = events
    .filter((event) => leagueIds.has(event.leagueId))
    .filter((event) => focusGroup !== "selecao" || isBrazilEvent(event, getTeam));
  const liveAndUpcoming = scopedEvents
    .filter((event) => event.status !== "finished")
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const recentResults = scopedEvents
    .filter((event) => event.status === "finished")
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));

  const standings = focusGroup === "selecao"
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

  const groupLabel = FOCUS_GROUPS.find((group) => group.id === focusGroup)?.label ?? "Competição";

  return (
    <section aria-label={groupLabel} className="competitions-page" data-sport={focusGroup}>
      {hasTabs && (
        <nav className="competition-tabs" role="tablist" aria-label="Filtrar por competição">
          {tabs.map((tab, index) => (
            <button
              key={tab.leagueId ?? "all"}
              ref={(element) => { tabButtons.current[index] = element; }}
              id={`${tabId}-tab-${index}`}
              type="button"
              role="tab"
              aria-controls={`${tabId}-panel`}
              aria-selected={selectedTabIndex === index}
              tabIndex={selectedTabIndex === index ? 0 : -1}
              onClick={() => setActiveLeagueId(tab.leagueId)}
              onKeyDown={(event) => {
                if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                event.preventDefault();
                const next = event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? tabs.length - 1
                    : (index + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
                setActiveLeagueId(tabs[next].leagueId);
                tabButtons.current[next]?.focus();
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      )}

      <div
        id={hasTabs ? `${tabId}-panel` : undefined}
        role={hasTabs ? "tabpanel" : undefined}
        aria-labelledby={hasTabs ? `${tabId}-tab-${selectedTabIndex}` : undefined}
        className="competitions-tab-panel"
      >
      {standings.length > 0 && (
        <section className="team-module">
          <header>
            <h2>Desempenho recente</h2>
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
          <h2>Ao vivo e próximos jogos</h2>
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
      </div>
    </section>
  );
}
