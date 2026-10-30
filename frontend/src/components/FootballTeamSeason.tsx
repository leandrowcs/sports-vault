import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { sportsService } from "../services/sportsService";
import { EventCard } from "./EventCard";
import { StatisticsGrid } from "./StatisticsGrid";
import type { SportMetric } from "../helpers/sportStatistics";
import type { FootballStanding, League, SportEvent, Team } from "../types/sports";


type Outcome = "V" | "E" | "D";
interface TeamResult { event: SportEvent; home: boolean; own: number; other: number }

const outcomeLabels: Record<Outcome, string> = { V: "Vitória", E: "Empate", D: "Derrota" };
const outcomeOf = ({ own, other }: TeamResult): Outcome => (own > other ? "V" : own < other ? "D" : "E");
const metric = (key: string, label: string, value: number | null): SportMetric => ({
  key,
  label,
  value: value !== null && Number.isFinite(value) ? value : null,
});

function seasonMetrics(results: TeamResult[], standing?: FootballStanding): SportMetric[] {
  const games = results.length;
  const wins = results.filter((result) => outcomeOf(result) === "V").length;
  const draws = results.filter((result) => outcomeOf(result) === "E").length;
  const scored = results.reduce((sum, result) => sum + result.own, 0);
  const conceded = results.reduce((sum, result) => sum + result.other, 0);
  const points = wins * 3 + draws;
  const perGame = (total: number) => (games ? total / games : null);
  return [
    metric("position", "Posição", standing?.position ?? null),
    metric("points", "Pontos", games ? points : null),
    metric("games", "Jogos", games),
    metric("wins", "Vitórias", wins),
    metric("draws", "Empates", draws),
    metric("losses", "Derrotas", games - wins - draws),
    metric("goalsFor", "Gols marcados", scored),
    metric("goalsAgainst", "Gols sofridos", conceded),
    metric("goalDifference", "Saldo de gols", scored - conceded),
    metric("efficiency", "Aproveitamento (%)", games ? (points / (games * 3)) * 100 : null),
    metric("goalsPerGame", "Gols por jogo", perGame(scored)),
    metric("concededPerGame", "Gols sofridos por jogo", perGame(conceded)),
    metric("cleanSheets", "Jogos sem sofrer gol", results.filter((result) => result.other === 0).length),
    metric("homeWins", "Vitórias em casa", results.filter((result) => result.home && outcomeOf(result) === "V").length),
    metric("awayWins", "Vitórias fora", results.filter((result) => !result.home && outcomeOf(result) === "V").length),
  ];
}

export function FootballTeamSeason({ team, league, teams, onEvent }: {
  team: Team;
  league: League;
  teams: Team[];
  onEvent?: (event: SportEvent, eventTeams?: Team[]) => void;
}) {
  const schedule = useQuery({
    queryKey: ["football-rounds", league.id],
    queryFn: () => sportsService.getFootballSeasonSchedule(league.id),
    staleTime: 60_000,
  });
  const standings = useQuery({
    queryKey: ["football-standings", league.id],
    queryFn: () => sportsService.getLeagueStandings(league.id),
    staleTime: 60_000,
  });

  const season = useMemo(() => {
    const teamById = new Map([...teams, ...(schedule.data?.teams ?? [])].map((item) => [item.id, item]));
    const teamEvents = (schedule.data?.events ?? []).filter((event) => event.homeTeamId === team.id || event.awayTeamId === team.id);
    const results: TeamResult[] = teamEvents
      .filter((event) => event.status === "finished" && Number.isFinite(event.homeScore) && Number.isFinite(event.awayScore))
      .map((event) => {
        const home = event.homeTeamId === team.id;
        return { event, home, own: (home ? event.homeScore : event.awayScore)!, other: (home ? event.awayScore : event.homeScore)! };
      });
    const upcoming = teamEvents.filter((event) => event.status !== "finished").slice(0, 3);
    return { teamById, results, upcoming, recent: results.slice(-5).reverse() };
  }, [schedule.data, teams, team.id]);

  const standing = standings.data?.find((row) => row.teamId === team.id);
  const renderEvents = (events: SportEvent[]) => (
    <div className="game-list">
      {events.map((event) => {
        const home = season.teamById.get(event.homeTeamId);
        const away = season.teamById.get(event.awayTeamId);
        if (!home || !away) return null;
        return <EventCard key={event.id} event={event} home={home} away={away} competition={league} onSelect={onEvent ? (selected) => onEvent(selected, schedule.data?.teams) : undefined} />;
      })}
    </div>
  );

  if (schedule.isPending) return <section className="team-module"><p className="standing-empty" role="status">Carregando temporada…</p></section>;
  if (schedule.isError) {
    return (
      <section className="team-module">
        <div className="competition-query-error" role="alert">
          <p>Não foi possível carregar a temporada do clube.</p>
          <button type="button" onClick={() => void schedule.refetch()}>Tentar novamente</button>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="team-module">
        <header><h2>Campanha · {league.name}</h2></header>
        {season.results.length ? (
          <>
            <div className="football-form" role="img" aria-label={`Últimos ${season.recent.length} jogos: ${season.recent.map((result) => outcomeLabels[outcomeOf(result)]).join(", ")}`}>
              <span className="football-form-title">Forma recente</span>
              {season.recent.map((result) => <span key={result.event.id} className={`football-form-badge form-${outcomeOf(result)}`} aria-hidden="true">{outcomeOf(result)}</span>)}
            </div>
            <StatisticsGrid metrics={seasonMetrics(season.results, standing)} />
            {standings.isError && <p className="statistics-scope">Posição na tabela indisponível no momento.</p>}
          </>
        ) : <p className="standing-empty">Sem jogos concluídos com placar disponível.</p>}
      </section>
      <section className="team-module">
        <header><h2>Próximos jogos</h2></header>
        {season.upcoming.length ? renderEvents(season.upcoming) : <p className="standing-empty">Nenhum próximo jogo disponível.</p>}
      </section>
      <section className="team-module">
        <header><h2>Últimos resultados</h2></header>
        {season.recent.length ? renderEvents(season.recent.map((result) => result.event)) : <p className="standing-empty">Nenhum resultado disponível.</p>}
      </section>
    </>
  );
}
