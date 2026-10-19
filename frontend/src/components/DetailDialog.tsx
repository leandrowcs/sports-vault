import { useEffect, useState } from "react";
import { CalendarDays, ChevronRight } from "lucide-react";
import { sportsService } from "../services/sportsService";
import type { EventSummaryLeader, EventSummaryStat, FootballStanding, League, Player, SportEvent, SportEventSummary, Team } from "../types/sports";
import { isBrazilEvent } from "../helpers/focusGroups";
import { eventAggregateDescription, eventRoundDescription, formatEventDetailStatus } from "../helpers/eventDates";
export function EventSummaryStats({
  home,
  away,
  statistics,
}: {
  home: Team;
  away: Team;
  statistics: EventSummaryStat[];
}) {
  return (
    <div className="event-summary-table">
      <div className="event-summary-team-headings" aria-hidden="true">
        <span>{home.shortName}</span>
        <span>Estatística</span>
        <span>{away.shortName}</span>
      </div>
      {statistics.map((stat) => (
        <div key={stat.key} className="event-summary-row">
          <b>{stat.homeValue}</b>
          <span>{stat.label}</span>
          <b>{stat.awayValue}</b>
        </div>
      ))}
    </div>
  );
}
export function EventSummaryLeaders({ leaders }: { leaders: EventSummaryLeader[] }) {
  return (
    <div className="event-leader-grid">
      {leaders.map((leader) => (
        <article key={leader.key} className="event-leader-card">
          <span>{leader.label}</span>
          <b>{leader.homeValue}</b>
          <small>{leader.awayValue}</small>
        </article>
      ))}
    </div>
  );
}
export function DetailDialog({ team, event, players, teams, getTeam, getLeague, onSelectPlayer, onCompare, onClose }: { team: Team | null; event: SportEvent | null; players: Player[]; teams: Team[]; getTeam: (id: string) => Team; getLeague: (id: string) => League; onSelectPlayer: (player: Player) => void; onCompare: (teamAId: string, teamBId: string) => void; onClose: () => void }) {
  const selectedTeam = team ?? (event ? getTeam(event.homeTeamId) : null);
  const competition = event ? getLeague(event.leagueId) : selectedTeam ? getLeague(selectedTeam.leagueId) : null;
  const home = event ? getTeam(event.homeTeamId) : null;
  const away = event ? getTeam(event.awayTeamId) : null;
  const roster = team ? players.filter((player) => player.teamId === team.id) : [];
  const isScheduledFootball = event?.status === "scheduled" && competition?.sport === "football";
  const hasLeagueStandings = event?.leagueId === "brasileirao-a" || event?.leagueId === "brasileirao-b";
  const isBrazilResult = event?.status === "finished" && competition?.sport === "football" && isBrazilEvent(event, getTeam);
  const roundDescription = event ? eventRoundDescription(event) : "";
  const aggregateDescription = event ? eventAggregateDescription(event) : null;
  const rivals = team ? teams.filter((item) => item.leagueId === team.leagueId && item.id !== team.id) : [];
  const [rivalId, setRivalId] = useState(rivals[0]?.id ?? "");
  const [eventSummary, setEventSummary] = useState<SportEventSummary | null>(null);
  const [isLoadingEventSummary, setIsLoadingEventSummary] = useState(Boolean(event && !isScheduledFootball));
  const [eventSummaryError, setEventSummaryError] = useState<string | null>(null);
  const [leagueStandings, setLeagueStandings] = useState<FootballStanding[]>([]);
  const [isLoadingLeagueStandings, setIsLoadingLeagueStandings] = useState(Boolean(isScheduledFootball && hasLeagueStandings));
  const [leagueStandingsError, setLeagueStandingsError] = useState(false);
  const eventScorers = eventSummary?.scorers?.flatMap((scorer, index) => {
    const scorerTeam = [home, away].find((item) => item?.id === scorer.teamId);
    return scorerTeam ? [{ ...scorer, team: scorerTeam, key: `${scorer.teamId}-${scorer.player}-${index}` }] : [];
  }) ?? [];

  useEffect(() => {
    if (!event || isScheduledFootball) return;

    let isActive = true;

    sportsService
      .getEventSummary(event)
      .then((summary) => {
        if (!isActive) return;
        setEventSummary(summary?.sport === competition?.sport ? summary : null);
      })
      .catch(() => {
        if (!isActive) return;
        setEventSummary(null);
        setEventSummaryError("Não foi possível carregar as estatísticas da partida.");
      })
      .finally(() => {
        if (isActive) setIsLoadingEventSummary(false);
      });

    return () => {
      isActive = false;
    };
  }, [event, competition?.sport, isScheduledFootball]);

  useEffect(() => {
    if (!isScheduledFootball || !hasLeagueStandings || !event) return;

    let isActive = true;

    sportsService.getLeagueStandings(event.leagueId)
      .then((standings) => {
        if (isActive) setLeagueStandings(standings);
      })
      .catch(() => {
        if (isActive) {
          setLeagueStandings([]);
          setLeagueStandingsError(true);
        }
      })
      .finally(() => {
        if (isActive) setIsLoadingLeagueStandings(false);
      });

    return () => {
      isActive = false;
    };
  }, [event, hasLeagueStandings, isScheduledFootball]);

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="detail-dialog" role="dialog" aria-modal="true" aria-labelledby="detail-title" onMouseDown={(mouseEvent) => mouseEvent.stopPropagation()}>
        <button className="dialog-close" onClick={onClose} aria-label="Fechar detalhes">×</button>
        {team && (
          <>
            <span className="crest detail-crest" style={{ backgroundColor: team.color }}>{team.shortName.slice(0, 2)}</span>
            <p className="eyebrow">{competition?.name}</p>
            <h2 id="detail-title">{team.name}</h2>
            <p className="detail-copy">{team.city} · {competition?.country} · {competition?.season}</p>
            {roster.length > 0 && (
              <ul className="roster-list">
                {roster.map((player) => (
                  <li key={player.id}>
                    <button className="roster-item" onClick={() => onSelectPlayer(player)}>
                      {player.name}
                      <span>{player.position}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {rivals.length > 0 && (
              <div className="compare-box">
                <label>
                  Comparar com
                  <select value={rivalId} onChange={(changeEvent) => setRivalId(changeEvent.target.value)}>
                    {rivals.map((rival) => (
                      <option key={rival.id} value={rival.id}>{rival.name}</option>
                    ))}
                  </select>
                </label>
                <button className="primary-button" onClick={() => rivalId && onCompare(team.id, rivalId)}>
                  Ver Head-to-Head <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
        {event && home && away && (
          <>
            <p className="eyebrow">{competition?.name}</p>
            <h2 id="detail-title">{home.name} <span>vs</span> {away.name}</h2>
            <p className="detail-copy">{formatEventDetailStatus(event)}</p>
            {roundDescription && <p className="event-round">{roundDescription}</p>}
            {aggregateDescription && <p className="event-aggregate">{aggregateDescription}</p>}
            <p className="detail-venue"><CalendarDays size={16} />{event.venue}</p>
            <section className="event-summary-panel" aria-label="Resumo da partida">
              <div className="event-summary-header">
                <h3 className="player-section-title">Resumo da partida</h3>
                {eventSummary?.shortStatus && <span>{eventSummary.shortStatus}</span>}
              </div>
              {isScheduledFootball ? (
                <>
                  {hasLeagueStandings ? (
                    isLoadingLeagueStandings ? (
                      <p className="detail-copy" role="status">Carregando classificação...</p>
                    ) : leagueStandingsError ? (
                      <p className="detail-copy" role="alert">Não foi possível carregar a classificação da competição.</p>
                    ) : (
                      <>
                        <h4 className="event-standing-title">Classificação parcial · jogos encerrados</h4>
                        <div className="event-standing-pair">
                          {[home, away].map((side) => {
                            const standing = leagueStandings.find((row) => row.teamId === side.id);
                            return (
                              <article className="event-standing-card" key={side.id}>
                                <b>{side.name}</b>
                                {standing ? (
                                  <>
                                    <strong>{standing.position}º lugar</strong>
                                    <span>{standing.points} {standing.points === 1 ? "ponto" : "pontos"} · {standing.played} {standing.played === 1 ? "jogo" : "jogos"}</span>
                                  </>
                                ) : (
                                  <span>Classificação indisponível.</span>
                                )}
                              </article>
                            );
                          })}
                        </div>
                      </>
                    )
                  ) : (
                    <p className="detail-copy">Classificação indisponível para esta competição. Estatísticas da partida ficam disponíveis após o início.</p>
                  )}
                </>
              ) : (
                <>
                  {eventSummary?.note && <p className="event-summary-note">{eventSummary.note}</p>}
                  {isLoadingEventSummary ? (
                    <p className="detail-copy">{isBrazilResult ? "Carregando resumo e goleadores..." : "Carregando estatísticas..."}</p>
                  ) : eventSummaryError ? (
                    <p className="detail-copy" role="alert">{isBrazilResult ? "Não foi possível carregar o resumo e os goleadores da partida." : eventSummaryError}</p>
                  ) : eventSummary ? (
                    <>
                      {eventSummary.statistics.length > 0 ? (
                        <EventSummaryStats home={home} away={away} statistics={eventSummary.statistics} />
                      ) : (
                        <p className="detail-copy">Resumo estatístico indisponível para esta partida.</p>
                      )}
                      {eventSummary.leaders.length > 0 && (
                        <>
                          <h3 className="player-section-title">Destaques individuais</h3>
                          <EventSummaryLeaders leaders={eventSummary.leaders} />
                        </>
                      )}
                      {isBrazilResult && (
                        <>
                          <h3 className="player-section-title">Gols</h3>
                          {eventScorers.length ? <ul className="event-scorers">
                            {eventScorers.map((scorer) => <li key={scorer.key}>
                              <b>{scorer.player}</b><span>{scorer.team.name}{scorer.minute ? ` · ${scorer.minute}` : ""}</span>
                            </li>)}
                          </ul> : <p className="detail-copy">Goleadores indisponíveis para esta partida.</p>}
                        </>
                      )}
                    </>
                  ) : (
                    <p className="detail-copy">{isBrazilResult ? "Resumo e goleadores indisponíveis para esta partida." : "Resumo estatístico indisponível para esta partida."}</p>
                  )}
                </>
              )}
            </section>
          </>
        )}
      </section>
    </div>
  );
}
