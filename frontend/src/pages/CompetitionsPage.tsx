import { useId, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import { sportsService } from "../services/sportsService";
import { FOCUS_GROUPS, isBrazilEvent, leaguesForFocusGroup } from "../helpers/focusGroups";
import { EventCard } from "../components/EventCard";
import type { FocusGroupId, FootballStanding, League, SportEvent, Team } from "../types/sports";

function FootballStandings({ leagueId }: { leagueId: string }) {
  const standings = useQuery<FootballStanding[]>({
    queryKey: ["football-standings", leagueId],
    queryFn: () => sportsService.getLeagueStandings(leagueId),
    staleTime: 60_000,
  });

  return (
    <section className="team-module">
      <header><h2>Classificação</h2></header>
      {standings.isPending && <p className="standing-empty" role="status">Carregando classificação…</p>}
      {standings.isError && <div className="competition-query-error" role="alert"><p>Não foi possível carregar a classificação.</p><button type="button" onClick={() => void standings.refetch()}>Tentar novamente</button></div>}
      {standings.data && !standings.data.length && <p className="standing-empty">Classificação indisponível para esta temporada.</p>}
      {standings.data && standings.data.length > 0 && (
        <div className="football-standings-scroll" role="region" aria-label="Classificação do Brasileirão" tabIndex={0}>
          <table className="football-standings">
            <thead><tr><th scope="col">Pos.</th><th scope="col">Clube</th><th scope="col">Pts</th><th scope="col">J</th><th scope="col">V</th><th scope="col">E</th><th scope="col">D</th><th scope="col">GP</th><th scope="col">GC</th><th scope="col">SG</th></tr></thead>
            <tbody>{standings.data.map((row) => (
              <tr key={row.teamId}>
                <td>{row.position}</td><th scope="row">{row.teamName}</th><td>{row.points}</td><td>{row.played}</td><td>{row.wins}</td><td>{row.draws}</td><td>{row.losses}</td><td>{row.goalsFor}</td><td>{row.goalsAgainst}</td><td>{row.goalsFor - row.goalsAgainst}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}

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
  onSelectEvent: (event: SportEvent, eventTeams?: Team[]) => void;
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
  const tabs = [{ leagueId: null, label: "Todas" }, ...groupLeagues.map((league) => ({
    leagueId: league.id,
    label: league.id === "brasileirao-a" ? "Série A" : league.id === "brasileirao-b" ? "Série B" : league.name,
  }))];
  const selectedTabIndex = Math.max(0, tabs.findIndex((tab) => tab.leagueId === activeLeagueId));
  const hasTabs = groupLeagues.length > 1;
  const selectedLeagues = activeLeagueId ? groupLeagues.filter((league) => league.id === activeLeagueId) : groupLeagues;
  const leagueIds = new Set(selectedLeagues.map((league) => league.id));
  const standingsLeagueId = activeLeagueId === "brasileirao-a" || activeLeagueId === "brasileirao-b" ? activeLeagueId : null;
  const showCupRounds = activeLeagueId === "copa-do-brasil";
  const cupSchedule = useQuery({
    queryKey: ["football-rounds", activeLeagueId],
    queryFn: () => sportsService.getFootballSeasonSchedule(activeLeagueId!),
    enabled: showCupRounds,
    staleTime: 60_000,
  });
  const [selectedRoundKey, setSelectedRoundKey] = useState<string | null>(null);

  const scopedEvents = events
    .filter((event) => leagueIds.has(event.leagueId))
    .filter((event) => focusGroup !== "selecao" || isBrazilEvent(event, getTeam));
  const liveAndUpcoming = scopedEvents
    .filter((event) => event.status !== "finished")
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const recentResults = scopedEvents
    .filter((event) => event.status === "finished")
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));

  const cupRounds = useMemo(() => {
    const groups = new Map<string, SportEvent[]>();
    for (const event of cupSchedule.data?.events ?? []) {
      const label = event.roundLabel || "Partidas";
      const roundEvents = groups.get(label) ?? [];
      roundEvents.push(event);
      groups.set(label, roundEvents);
    }
    return [...groups].map(([label, roundEvents]) => ({
      key: `${label}:${roundEvents[0]?.startsAt ?? ""}`,
      label,
      events: roundEvents,
      startsAt: roundEvents[0]?.startsAt ?? "",
    })).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }, [cupSchedule.data]);
  const latestPlayedRoundIndex = cupRounds.reduce((latest, round, index) =>
    round.events.some((event) => event.status !== "scheduled") ? index : latest, -1);
  const selectedRoundIndex = Math.max(0, cupRounds.findIndex((round) => round.key === selectedRoundKey));
  const activeRoundIndex = cupRounds.some((round) => round.key === selectedRoundKey)
    ? selectedRoundIndex
    : Math.max(0, latestPlayedRoundIndex);
  const activeRound = cupRounds[activeRoundIndex];
  const roundTeams = useMemo(() => new Map(
    [...teams, ...(cupSchedule.data?.teams ?? [])].map((team) => [team.id, team]),
  ), [teams, cupSchedule.data]);
  const missingRoundTeams = activeRound?.events.some((event) =>
    !roundTeams.has(event.homeTeamId) || !roundTeams.has(event.awayTeamId),
  ) ?? false;

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
      {standingsLeagueId && <FootballStandings leagueId={standingsLeagueId} />}

      {showCupRounds ? (
        <section className="team-module">
          <header><h2>Rodadas da Copa do Brasil</h2></header>
          {cupSchedule.isPending && <p className="standing-empty" role="status">Carregando rodadas…</p>}
          {cupSchedule.isError && <div className="competition-query-error" role="alert"><p>Não foi possível carregar as rodadas.</p><button type="button" onClick={() => void cupSchedule.refetch()}>Tentar novamente</button></div>}
          {cupSchedule.data && !cupRounds.length && <p className="standing-empty">Nenhuma rodada disponível nesta temporada.</p>}
          {activeRound && (
            <>
              <nav className="football-round-pagination" aria-label="Navegar pelas rodadas da Copa do Brasil">
                <button type="button" aria-label="Rodada anterior" disabled={activeRoundIndex === 0} onClick={() => setSelectedRoundKey(cupRounds[activeRoundIndex - 1]?.key ?? null)}>
                  <ChevronLeft size={20} aria-hidden="true" /><span>Anterior</span>
                </button>
                <div aria-live="polite" aria-atomic="true"><strong>{activeRound.label}</strong><small>{activeRoundIndex + 1} de {cupRounds.length}</small></div>
                <button type="button" aria-label="Próxima rodada" disabled={activeRoundIndex >= cupRounds.length - 1} onClick={() => setSelectedRoundKey(cupRounds[activeRoundIndex + 1]?.key ?? null)}>
                  <span>Próxima</span><ChevronRight size={20} aria-hidden="true" />
                </button>
              </nav>
              {missingRoundTeams ? (
                <p className="standing-empty" role="alert">Dados dos clubes desta rodada indisponíveis.</p>
              ) : (
                <div className="game-list">
                  {activeRound.events.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      home={roundTeams.get(event.homeTeamId)!}
                      away={roundTeams.get(event.awayTeamId)!}
                      competition={getLeague(event.leagueId)}
                      onSelect={(selectedEvent) => onSelectEvent(selectedEvent, cupSchedule.data?.teams)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      ) : (
      <>
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
      </>
      )}
      </div>
    </section>
  );
}
