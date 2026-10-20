import { useId, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import { sportsService } from "../services/sportsService";
import { FOCUS_GROUPS, isBrazilEvent, leaguesForFocusGroup } from "../helpers/focusGroups";
import { eventDay, groupSchedule } from "../helpers/homeSchedule";
import { EventCard } from "../components/EventCard";
import type { FocusGroupId, FootballStanding, League, SportEvent, Team } from "../types/sports";

function FootballStandings({ leagueId }: { leagueId: string }) {
  const standings = useQuery<FootballStanding[]>({
    queryKey: ["football-standings", leagueId],
    queryFn: () => sportsService.getLeagueStandings(leagueId),
    staleTime: 60_000,
  });

  return (
    <details className="team-module competition-standings" open>
      <summary><h2>Classificação</h2><ChevronDown size={20} aria-hidden="true" /></summary>
      {standings.isPending && <p className="standing-empty" role="status">Carregando classificação…</p>}
      {standings.isError && <div className="competition-query-error" role="alert"><p>Não foi possível carregar a classificação.</p><button type="button" onClick={() => void standings.refetch()}>Tentar novamente</button></div>}
      {standings.data && !standings.data.length && <p className="standing-empty">Classificação indisponível para esta temporada.</p>}
      {standings.data && standings.data.length > 0 && (
        <div className="football-standings-scroll" role="region" aria-label={`Classificação ${leagueId === "brasileirao-a" ? "da Série A" : "da Série B"}`} tabIndex={0}>
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
    </details>
  );
}

function RoundPagination({ label, index, count, onPrevious, onNext }: {
  label: string;
  index: number;
  count: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <nav className="football-round-pagination" aria-label={`Navegar: ${label}`}>
      <button type="button" aria-label="Rodada anterior" disabled={index <= 0} onClick={onPrevious}>
        <ChevronLeft size={20} aria-hidden="true" /><span>Anterior</span>
      </button>
      <div aria-live="polite" aria-atomic="true"><strong>{label}</strong><small>{index + 1} de {count}</small></div>
      <button type="button" aria-label="Próxima rodada" disabled={index >= count - 1} onClick={onNext}>
        <span>Próxima</span><ChevronRight size={20} aria-hidden="true" />
      </button>
    </nav>
  );
}

function RoundEvents({ events, teams, competition, onSelectEvent }: {
  events: SportEvent[];
  teams: Map<string, Team>;
  competition: League;
  onSelectEvent: (event: SportEvent) => void;
}) {
  const missingTeams = events.some((event) => !teams.has(event.homeTeamId) || !teams.has(event.awayTeamId));
  if (missingTeams) return <p className="standing-empty" role="alert">Dados dos clubes desta rodada indisponíveis.</p>;

  return (
    <div className="football-round-dates">
      {groupSchedule(events, eventDay).map(([day, dayEvents]) => (
        <section className="football-round-date" key={day}>
          <h3>{day}</h3>
          <div className="game-list">
            {dayEvents.map((event) => (
              <EventCard key={event.id} event={event} home={teams.get(event.homeTeamId)!} away={teams.get(event.awayTeamId)!} competition={competition} onSelect={onSelectEvent} />
            ))}
          </div>
        </section>
      ))}
    </div>
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
  const showLeagueSchedule = activeLeagueId === "brasileirao-a" || activeLeagueId === "brasileirao-b";
  const hasSeasonSchedule = showCupRounds || showLeagueSchedule;
  const cupSchedule = useQuery({
    queryKey: ["football-rounds", activeLeagueId],
    queryFn: () => sportsService.getFootballSeasonSchedule(activeLeagueId!),
    enabled: hasSeasonSchedule,
    staleTime: 60_000,
  });
  const [selectedRoundKey, setSelectedRoundKey] = useState<string | null>(null);
  const [upcomingRoundIndex, setUpcomingRoundIndex] = useState(0);
  const [resultsRoundIndex, setResultsRoundIndex] = useState<number | null>(null);

  const scopedEvents = events
    .filter((event) => leagueIds.has(event.leagueId))
    .filter((event) => focusGroup !== "selecao" || isBrazilEvent(event, getTeam));
  const liveAndUpcoming = scopedEvents
    .filter((event) => event.status !== "finished")
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const recentResults = scopedEvents
    .filter((event) => event.status === "finished")
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));

  const competitionRounds = useMemo(() => {
    const groups = new Map<string, SportEvent[]>();
    for (const event of cupSchedule.data?.events ?? []) {
      const label = showCupRounds ? event.roundLabel || "Partidas" : event.roundLabel || eventDay(event);
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
  }, [cupSchedule.data, showCupRounds]);
  const cupRounds = showCupRounds ? competitionRounds : [];
  const leagueUpcomingRounds = competitionRounds
    .map((round) => ({ ...round, events: round.events.filter((event) => event.status !== "finished") }))
    .filter((round) => round.events.length > 0);
  const leagueResultsRounds = competitionRounds
    .map((round) => ({ ...round, events: round.events.filter((event) => event.status === "finished") }))
    .filter((round) => round.events.length > 0);
  const activeUpcomingRoundIndex = Math.min(upcomingRoundIndex, Math.max(leagueUpcomingRounds.length - 1, 0));
  const activeResultsRoundIndex = Math.min(resultsRoundIndex ?? leagueResultsRounds.length - 1, Math.max(leagueResultsRounds.length - 1, 0));
  const activeUpcomingRound = leagueUpcomingRounds[activeUpcomingRoundIndex];
  const activeResultsRound = leagueResultsRounds[activeResultsRoundIndex];
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

      {hasSeasonSchedule ? (
        <>
        {cupSchedule.isPending && <p className="standing-empty" role="status">Carregando partidas da temporada…</p>}
        {cupSchedule.isError && <div className="competition-query-error" role="alert"><p>Não foi possível carregar as partidas da temporada.</p><button type="button" onClick={() => void cupSchedule.refetch()}>Tentar novamente</button></div>}
        {cupSchedule.data && !competitionRounds.length && <p className="standing-empty">Nenhuma partida disponível nesta temporada.</p>}
        {showCupRounds && activeRound && (
        <section className="team-module">
          <header><h2>Rodadas da Copa do Brasil</h2></header>
          <RoundPagination
            label={activeRound.label}
            index={activeRoundIndex}
            count={cupRounds.length}
            onPrevious={() => setSelectedRoundKey(cupRounds[activeRoundIndex - 1]?.key ?? null)}
            onNext={() => setSelectedRoundKey(cupRounds[activeRoundIndex + 1]?.key ?? null)}
          />
          <RoundEvents
            events={activeRound.events}
            teams={roundTeams}
            competition={getLeague("copa-do-brasil")}
            onSelectEvent={(event) => onSelectEvent(event, cupSchedule.data?.teams)}
          />
        </section>
        )}
        {showLeagueSchedule && (
      <>
        <section className="team-module">
          <header><h2>Próximos jogos</h2></header>
          {cupSchedule.data && activeUpcomingRound ? (
            <>
              <RoundPagination
                label={activeUpcomingRound.label}
                index={activeUpcomingRoundIndex}
                count={leagueUpcomingRounds.length}
                onPrevious={() => setUpcomingRoundIndex((index) => Math.max(0, Math.min(index, leagueUpcomingRounds.length - 1) - 1))}
                onNext={() => setUpcomingRoundIndex((index) => Math.min(leagueUpcomingRounds.length - 1, (index ?? 0) + 1))}
              />
              <RoundEvents
                events={activeUpcomingRound.events}
                teams={roundTeams}
                competition={getLeague(activeLeagueId!)}
                onSelectEvent={(event) => onSelectEvent(event, cupSchedule.data?.teams)}
              />
            </>
          ) : cupSchedule.data ? (
            <p className="standing-empty">Nenhum jogo futuro disponível.</p>
          ) : null}
        </section>

        <section className="team-module">
          <header><h2>Últimos resultados</h2></header>
          {cupSchedule.data && activeResultsRound ? (
            <>
              <RoundPagination
                label={activeResultsRound.label}
                index={activeResultsRoundIndex}
                count={leagueResultsRounds.length}
                onPrevious={() => setResultsRoundIndex((index) => Math.max(0, (index ?? leagueResultsRounds.length - 1) - 1))}
                onNext={() => setResultsRoundIndex((index) => Math.min(leagueResultsRounds.length - 1, (index ?? leagueResultsRounds.length - 1) + 1))}
              />
              <RoundEvents
                events={activeResultsRound.events}
                teams={roundTeams}
                competition={getLeague(activeLeagueId!)}
                onSelectEvent={(event) => onSelectEvent(event, cupSchedule.data?.teams)}
              />
            </>
          ) : cupSchedule.data ? (
            <div className="empty-state"><Trophy size={25} /><h3>Nenhum resultado disponível.</h3></div>
          ) : null}
        </section>
      </>
        )}
        </>
      ) : (
        <>
          <section className="team-module">
            <header><h2>Ao vivo e próximos jogos</h2></header>
            {liveAndUpcoming.length ? (
              <div className="game-list">{liveAndUpcoming.map((event) => (
                <EventCard key={event.id} event={event} home={getTeam(event.homeTeamId)} away={getTeam(event.awayTeamId)} competition={getLeague(event.leagueId)} onSelect={onSelectEvent} />
              ))}</div>
            ) : <p className="standing-empty">Nenhum jogo agendado no recorte carregado.</p>}
          </section>
          <section className="team-module">
            <header><h2>Últimos resultados</h2></header>
            {recentResults.length ? (
              <div className="game-list">{recentResults.map((event) => (
                <EventCard key={event.id} event={event} home={getTeam(event.homeTeamId)} away={getTeam(event.awayTeamId)} competition={getLeague(event.leagueId)} onSelect={onSelectEvent} />
              ))}</div>
            ) : <div className="empty-state"><Trophy size={25} /><h3>Nenhum resultado disponível.</h3></div>}
          </section>
        </>
      )}
      </div>
    </section>
  );
}
