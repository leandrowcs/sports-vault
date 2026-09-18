import { useState, type ReactNode } from "react";
import { ChevronDown, Trophy } from "lucide-react";
import { FOCUS_GROUPS, getFocusGroup, isBrazilEvent } from "../helpers/focusGroups";
import { eventDay, groupSchedule, weekLabel } from "../helpers/homeSchedule";
import { SportIcon } from "../components/SportIcon";
import { EventCard } from "../components/EventCard";
import { HomeEventStats } from "../components/HomeEventStats";
import type { FocusGroupId, League, SportEvent, Team } from "../types/sports";

function ScheduleGroup({ title, count, children, initiallyOpen = true }: { title: string; count: number; children: ReactNode; initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <section className="schedule-group">
      <button className="schedule-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span>{title}</span><span className="schedule-count">{count} {count === 1 ? "jogo" : "jogos"}</span><ChevronDown size={18} />
      </button>
      {open && <div className="schedule-content">{children}</div>}
    </section>
  );
}

export function VaultFeedHome({ events, getTeam, getLeague, leagues, onSelectEvent }: {
  events: SportEvent[];
  getTeam: (id: string) => Team;
  getLeague: (id: string) => League;
  leagues: League[];
  onSelectEvent: (event: SportEvent) => void;
}) {
  const availableGroups = FOCUS_GROUPS.filter((group) => leagues.some((league) => getFocusGroup(league) === group.id));
  const [activeGroup, setActiveGroup] = useState<FocusGroupId>(() => availableGroups.find((group) => events.some((event) =>
    getFocusGroup(getLeague(event.leagueId)) === group.id && (group.id !== "selecao" || isBrazilEvent(event, getTeam)),
  ))?.id ?? availableGroups[0]?.id ?? "futebol");
  const groupEvents = events.filter((event) => getFocusGroup(getLeague(event.leagueId)) === activeGroup)
    .filter((event) => activeGroup !== "selecao" || isBrazilEvent(event, getTeam));
  const isBasketball = activeGroup === "nba";
  const isNFL = activeGroup === "nfl";
  const groups = groupSchedule(groupEvents, (event) => isBasketball || isNFL ? weekLabel(event) : getLeague(event.leagueId).name);

  function datedGames(games: SportEvent[]) {
    return groupSchedule(games, eventDay).map(([day, dayEvents]) => (
      <section className="schedule-day" key={day}>
        <h3>{day} <small>UTC</small></h3>
        <div className="game-list">
          {dayEvents.map((event) => (
            <div className="home-game" key={event.id}>
              <EventCard event={event} home={getTeam(event.homeTeamId)} away={getTeam(event.awayTeamId)} competition={getLeague(event.leagueId)} onSelect={onSelectEvent} />
              {(isBasketball || isNFL) && event.status !== "scheduled" && <HomeEventStats event={event} home={getTeam(event.homeTeamId)} away={getTeam(event.awayTeamId)} basketball={isBasketball} />}
            </div>
          ))}
        </div>
      </section>
    ));
  }

  return (
    <section className="vault-feed-home" aria-label="Resumo da rodada">
      <nav className="competition-filters" aria-label="Filtrar por competição">
        {availableGroups.map((group) => <button key={group.id} data-sport={group.id} aria-pressed={activeGroup === group.id} onClick={() => setActiveGroup(group.id)}><SportIcon sport={group.id} />{group.label}</button>)}
      </nav>
      <div className="vault-feed-section-heading inline-heading"><h2>{isBasketball ? "Jogos da semana" : "Jogos da rodada"}</h2><span>{groupEvents.length} jogos</span></div>
      <div className="schedule-groups" key={activeGroup}>
        {groups.map(([title, games]) => (
          <ScheduleGroup key={title} title={title} count={games.length}>
            {isNFL && <section className="round-statistics" aria-label="Estatísticas da rodada">
              <h3>Estatísticas da rodada</h3>
              <dl>
                <div><dt>Finalizados</dt><dd>{games.filter((game) => game.status === "finished").length}</dd></div>
                <div><dt>Em andamento</dt><dd>{games.filter((game) => game.status === "live").length}</dd></div>
                <div><dt>Pontos nos jogos finalizados</dt><dd>{games.some((game) => game.status === "finished" && game.homeScore !== undefined && game.awayScore !== undefined) ? games.filter((game) => game.status === "finished").reduce((total, game) => total + (game.homeScore ?? 0) + (game.awayScore ?? 0), 0) : "—"}</dd></div>
              </dl>
            </section>}
            {isBasketball ? ([{ status: "live", label: "Em andamento" }, { status: "scheduled", label: "Próximos jogos" }, { status: "finished", label: "Finalizados" }] as const).map(({ status, label }) => {
              const matches = games.filter((game) => game.status === status);
              return <ScheduleGroup key={status} title={label} count={matches.length} initiallyOpen={status !== "finished"}>
                {matches.length ? datedGames(matches) : <p className="statistics-scope">Nenhum jogo neste grupo.</p>}
              </ScheduleGroup>;
            }) : datedGames(games)}
          </ScheduleGroup>
        ))}
      </div>
      {!groupEvents.length && <div className="empty-state compact-empty"><Trophy size={25} /><h3>Nenhum jogo disponível.</h3><p>Volte em breve para acompanhar a rodada.</p></div>}
    </section>
  );
}
