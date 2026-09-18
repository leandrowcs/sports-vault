import { useState } from "react";
import { Bell, CircleUserRound, Heart, Menu, Trophy } from "lucide-react";
import { FOCUS_GROUPS, getFocusGroup, isBrazilEvent } from "../helpers/focusGroups";
import { EventCard } from "../components/EventCard";
import type { FocusGroupId, League, Player, SportEvent, Team } from "../types/sports";

export function VaultFeedHome({
  events,
  favorites,
  getTeam,
  getLeague,
  leagues,
  onOpenFavorites,
  onSelectEvent,
}: {
  events: SportEvent[];
  favorites: Team[];
  players: Player[];
  getTeam: (id: string) => Team;
  getLeague: (id: string) => League;
  leagues: League[];
  onOpenGames: () => void;
  onOpenFavorites: () => void;
  onOpenVault: () => void;
  onOpenSearch: () => void;
  onSelectEvent: (event: SportEvent) => void;
}) {
  const availableGroups = FOCUS_GROUPS.filter((group) => leagues.some((league) => getFocusGroup(league) === group.id));
  const [activeGroup, setActiveGroup] = useState<FocusGroupId>(() =>
    availableGroups.find((group) => events.some((event) =>
      getFocusGroup(getLeague(event.leagueId)) === group.id
      && (group.id !== "selecao" || isBrazilEvent(event, getTeam)),
    ))?.id ?? availableGroups[0]?.id ?? "futebol",
  );
  const liveEvents = events.filter((event) => event.status === "live");

  const groupEvents = events
    .filter((event) => getFocusGroup(getLeague(event.leagueId)) === activeGroup)
    .filter((event) => activeGroup !== "selecao" || isBrazilEvent(event, getTeam))
    .sort((a, b) => {
      const rank = (status: SportEvent["status"]) => (status === "live" ? 0 : status === "scheduled" ? 1 : 2);
      const rankDiff = rank(a.status) - rank(b.status);
      return rankDiff !== 0 ? rankDiff : a.startsAt.localeCompare(b.startsAt);
    });

  return (
    <section className="vault-feed-home" aria-label="Resumo da rodada">
      <div className="vault-mobile-topbar">
        <div className="vault-mobile-brand">
          <button className="icon-button" aria-label="Menu principal">
            <Menu size={20} />
          </button>
          <img className="vault-logo" src="/icon.svg" alt="" width="32" height="32" />
          <b>SPORTS VAULT</b>
        </div>
        <div className="vault-mobile-actions">
          <button className="icon-button notification-button" aria-label="Notificações">
            <Bell size={20} />
            {liveEvents.length > 0 && <span />}
          </button>
          <CircleUserRound size={28} />
        </div>
      </div>

      <nav className="competition-filters" aria-label="Filtrar por competição">
        {availableGroups.map((group) => {
          const count = events.filter((event) => getFocusGroup(getLeague(event.leagueId)) === group.id
            && (group.id !== "selecao" || isBrazilEvent(event, getTeam))
            && event.status === "live").length;
          return (
            <button key={group.id} aria-pressed={activeGroup === group.id} onClick={() => setActiveGroup(group.id)}>
              {group.label}
              {count > 0 && <span>{count} ao vivo</span>}
            </button>
          );
        })}
      </nav>

      <div className="vault-feed-section-heading inline-heading">
        <div>
          <h2>Jogos da rodada</h2>
        </div>
        <span>{groupEvents.length} {groupEvents.length === 1 ? "jogo" : "jogos"}</span>
      </div>
      {groupEvents.length ? (
        <div className="game-list">
          {groupEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              home={getTeam(event.homeTeamId)}
              away={getTeam(event.awayTeamId)}
              competition={getLeague(event.leagueId)}
              onSelect={onSelectEvent}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state compact-empty">
          <Trophy size={25} />
          <h3>Nenhum jogo disponível.</h3>
          <p>Volte em breve para acompanhar a rodada.</p>
        </div>
      )}

      <section className="quick-standings">
        <div className="vault-feed-section-heading inline-heading">
          <div>
            <h2>Seus times favoritos</h2>
          </div>
          <button onClick={onOpenFavorites}>
            Ver favoritos
          </button>
        </div>
        {favorites.length ? (
          <div className="mini-standing">
            {favorites.slice(0, 4).map((team) => (
              <article key={team.id}>
                <h3>{team.name}</h3>
                <p className="statistics-scope">{getLeague(team.leagueId).name}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state compact-empty">
            <Heart size={25} />
            <h3>Nenhum favorito salvo.</h3>
            <p>Adicione times na aba Favoritos.</p>
          </div>
        )}
      </section>
    </section>
  );
}
