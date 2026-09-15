import { teamMetrics, sportNames } from "../helpers/sportStatistics";
import { useRef } from "react";
import { ArrowRight, BarChart3, Bell, Bot, ChevronLeft, ChevronRight, CircleUserRound, Menu, Sparkles, Trophy } from "lucide-react";
import type { League, GameStatus, Player, SportEvent, Team } from "../types/sports";
export function VaultFeedHome({
  events,
  favorites,
  players,
  getTeam,
  getLeague,
  onOpenGames,
  onOpenSearch,
  onSelectEvent,
}: {
  events: SportEvent[];
  favorites: Team[];
  players: Player[];
  getTeam: (id: string) => Team;
  getLeague: (id: string) => League;
  onOpenGames: () => void;
  onOpenFavorites: () => void;
  onOpenVault: () => void;
  onOpenSearch: () => void;
  onSelectEvent: (event: SportEvent) => void;
}) {
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const liveEvents = events.filter((event) => event.status === "live");
  const featuredEvents = [
    ...liveEvents,
    ...events.filter((event) => event.status === "scheduled"),
    ...events.filter((event) => event.status === "finished"),
  ].slice(0, 4);
  const featuredPlayer = players[0];
  const featuredTeam = featuredPlayer ? getTeam(featuredPlayer.teamId) : favorites[0];
  const topPlayers = players.slice(0, 2);
  const scrollFeaturedMatches = (direction: "left" | "right") => {
    carouselRef.current?.scrollBy({
      behavior: "smooth",
      left: direction === "left" ? -324 : 324,
    });
  };

  return (
    <section className="vault-feed-home" aria-label="The Vault Feed">
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
            <span />
          </button>
          <CircleUserRound size={28} />
        </div>
      </div>

      <nav className="sport-filter-strip" aria-label="Filtros por esporte">
        <button className="sport-filter active">
          <span className="filter-dot" />
          Para Você
        </button>
        <button className="sport-filter live">
          <span className="live-dot" />
          Ao Vivo ({liveEvents.length})
        </button>
        <button className="sport-filter">
          <Trophy size={14} />
          Futebol
        </button>
        <button className="sport-filter">
          <Trophy size={14} />
          NBA
        </button>
        <button className="sport-filter">
          <Trophy size={14} />
          NFL
        </button>
      </nav>

      <div className="vault-feed-section-heading carousel-heading">
        <div>
          <span className="filter-dot pulse" />
          <h2>Jogos Ao Vivo & Destaque</h2>
        </div>
        <div className="carousel-actions">
          <span>{liveEvents.length} ativos</span>
          <button type="button" onClick={() => scrollFeaturedMatches("left")} aria-label="Ver jogos anteriores">
            <ChevronLeft size={16} />
          </button>
          <button type="button" onClick={() => scrollFeaturedMatches("right")} aria-label="Ver próximos jogos">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      {featuredEvents.length ? (
        <div className="featured-match-carousel" ref={carouselRef}>
          {featuredEvents.map((event) => (
            <FeaturedMatchCard
              key={event.id}
              event={event}
              home={getTeam(event.homeTeamId)}
              away={getTeam(event.awayTeamId)}
              league={getLeague(event.leagueId)}
              player={topPlayers.find((item) => item.teamId === event.homeTeamId || item.teamId === event.awayTeamId)}
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

      <p className="preview-note">Prévia: os alertas e artigos abaixo são demonstrativos.</p>
      <section className="vault-alert-card">
        <div className="vault-feed-section-heading inline-heading">
          <div>
            <Bot size={18} />
            <h2>Alertas do seu Vault</h2>
          </div>
          <span>Inteligência preditiva</span>
        </div>
        <article>
          <div>
            <span className="insight-badge">
              <Sparkles size={13} fill="currentColor" />
              Estatística histórica
            </span>
            <h3>
              {featuredPlayer?.name ?? "Seu time favorito"} entrou no radar com destaque de desempenho nesta temporada.
            </h3>
            <p>
              O Vault cruza jogos recentes, forma dos atletas e contexto da liga para destacar sinais importantes antes da rodada.
            </p>
          </div>
          <div className="alert-thumb">
            <span>{featuredTeam?.shortName.slice(0, 2) ?? "SV"}</span>
          </div>
        </article>
        <footer>
          <span>Radar de jogador • {featuredTeam?.name ?? "Sports Vault"}</span>
          <button onClick={onOpenSearch}>
            Explorar métricas <ArrowRight size={14} />
          </button>
        </footer>
      </section>

      <section className="quick-standings">
        <div className="vault-feed-section-heading inline-heading">
          <div>
            <h2>Resultados dos favoritos</h2>
          </div>
          <button onClick={onOpenGames}>
            Ver jogos <ChevronRight size={14} />
          </button>
        </div>
        <div className="standings-card">
          <MiniStanding teams={favorites.slice(0, 3)} events={events} getLeague={getLeague} />
        </div>
      </section>

      <section className="insights-feed">
        <div className="vault-feed-section-heading inline-heading">
          <div>
            <BarChart3 size={18} />
            <h2>Análises & Insights</h2>
          </div>
          <span>Feed editorial</span>
        </div>
        <div className="analysis-list">
          <AnalysisCard
            tag="Tática • Futebol"
            title="Como a pressão alta muda a saída de bola nos grandes jogos"
            byline="Por Redação Vault IA"
            tone="green"
          />
          <AnalysisCard
            tag="NBA • Advanced Metrics"
            title="O impacto do espaçamento ofensivo no clutch time"
            byline="Por Lucas Albuquerque"
            tone="blue"
          />
        </div>
      </section>

    </section>
  );
}
function FeaturedMatchCard({
  event,
  home,
  away,
  league,
  player,
  onSelect,
}: {
  event: SportEvent;
  home: Team;
  away: Team;
  league: League;
  player?: Player;
  onSelect: (event: SportEvent) => void;
}) {
  const kickoff = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(event.startsAt));

  return (
    <article className="featured-match-card" role="button" tabIndex={0} onClick={() => onSelect(event)} onKeyDown={(keyEvent) => {
      if (keyEvent.key === "Enter" || keyEvent.key === " ") {
        keyEvent.preventDefault();
        onSelect(event);
      }
    }}>
      <div className="match-accent" style={{ backgroundColor: league.color }} />
      <header>
        <span>
          <Trophy size={14} />
          {league.name}
        </span>
        <b className={event.status === "live" ? "live-badge" : "time-badge"}>
          {event.status === "live" ? "AO VIVO" : event.status === "finished" ? "Encerrado" : kickoff}
        </b>
      </header>
      <div className="featured-scoreboard">
        <TeamScoreRow team={home} score={event.homeScore} status={event.status} highlight />
        <TeamScoreRow team={away} score={event.awayScore} status={event.status} />
      </div>
      {event.status === "live" ? (
        <p className="detail-copy">Abra a partida para consultar as estatísticas disponíveis.</p>
      ) : (
        <div className="player-highlight">
          <span>{player?.name.slice(0, 2).toUpperCase() ?? home.shortName.slice(0, 2)}</span>
          <div>
            <b>{player?.name ?? home.name}</b>
            <small>{player?.position ?? event.venue}</small>
          </div>
          <strong>{event.status === "finished" ? "Resultado" : "Pré-jogo"}</strong>
        </div>
      )}
    </article>
  );
}
function TeamScoreRow({ team, score, status, highlight }: { team: Team; score?: number; status: GameStatus; highlight?: boolean }) {
  return (
    <div className="team-score-row">
      <div>
        <span className="mini-crest" style={{ backgroundColor: team.color }}>
          {team.shortName.slice(0, 2)}
        </span>
        <b>{team.name}</b>
      </div>
      <strong className={highlight ? "highlight" : ""}>{status === "scheduled" ? "vs" : score ?? 0}</strong>
    </div>
  );
}
function MiniStanding({ teams, events, getLeague }: { teams: Team[]; events: SportEvent[]; getLeague: (id: string) => League }) {
  return <div className="mini-standing">{teams.length ? teams.map((team) => {
    const sport = getLeague(team.leagueId).sport;
    const metrics = teamMetrics(sport, team, events);
    const score = metrics.find((metric) => ['goalsFor', 'pointsPerGame', 'pointsFor'].includes(metric.key));
    return <article key={team.id}><h3>{team.name}</h3><p className="statistics-scope">{sportNames[sport]} · {getLeague(team.leagueId).name}</p><p className="statistics-scope">{score ? score.label + ': ' + new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(score.value!) : 'Sem resultados disponíveis.'}</p></article>;
  }) : <p className="standing-empty">Nenhum favorito salvo.</p>}<p className="statistics-scope">Recorte de jogos carregados; não representa a classificação da temporada.</p></div>;
}
function AnalysisCard({ tag, title, byline, tone }: { tag: string; title: string; byline: string; tone: "green" | "blue" }) {
  return (
    <article className="analysis-card">
      <div className={`analysis-thumb ${tone}`}>
        <BarChart3 size={24} />
      </div>
      <div>
        <span>{tag}</span>
        <h3>{title}</h3>
        <p>{byline}</p>
      </div>
    </article>
  );
}
