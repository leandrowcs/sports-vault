import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronRight,
  Compass,
  Heart,
  Home,
  LogIn,
  LogOut,
  Search,
  Trophy,
} from "lucide-react";
import "./App.css";
import { LoginScreen } from "./components/LoginScreen";
import { useCloudAuth } from "./hooks/useCloudAuth";
import { sportsService } from "./services/sportsService";
import {
  readLocalVault,
  subscribeToCloudVault,
  writeVault,
} from "./services/vaultStore";
import type {
  League,
  SportEvent,
  Team,
  VaultState,
  View,
} from "./types/sports";
interface SportsData {
  leagues: League[];
  teams: Team[];
  events: SportEvent[];
}
const navigation: { id: View; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Início", icon: Home },
  { id: "vault", label: "Meu Vault", icon: Heart },
  { id: "games", label: "Jogos", icon: Trophy },
  { id: "search", label: "Buscar", icon: Search },
];
function App() {
  const [view, setView] = useState<View>("home");
  const [data, setData] = useState<SportsData | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [vault, setVault] = useState<VaultState>(readLocalVault);
  const vaultRef = useRef(vault);
  const [query, setQuery] = useState("");
  const [gameSport, setGameSport] = useState<"all" | "football" | "basketball">("all");
  const [gameStatus, setGameStatus] = useState<"all" | "scheduled" | "finished">("all");
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<SportEvent | null>(null);
  const [vaultError, setVaultError] = useState<string | null>(null);
  const {
    error: authError,
    isConfigured,
    isLoading: isAuthLoading,
    signIn,
    signOut,
    user,
  } = useCloudAuth();
  useEffect(() => {
    Promise.all([
      sportsService.getLeagues(),
      sportsService.getTeams(),
      sportsService.getEvents(),
    ])
      .then(([leagues, teams, events]) => setData({ leagues, teams, events }))
      .catch(() => setDataError("Não foi possível carregar os dados esportivos."));
  }, []);
  useEffect(() => {
    vaultRef.current = vault;
  }, [vault]);
  useEffect(() => {
    if (!user) return;

    return (
      subscribeToCloudVault(
        user.uid,
        (cloudVault, exists) => {
          if (!exists) {
            void writeVault(user.uid, vaultRef.current).catch(() =>
              setVaultError("Favoritos salvos apenas neste dispositivo."),
            );
            return;
          }
          setVault(cloudVault);
        },
        () => setVaultError("Favoritos salvos apenas neste dispositivo."),
      ) ?? undefined
    );
  }, [user]);
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedTeam(null);
        setSelectedEvent(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  function toggleTeam(teamId: string) {
    setVault((current) => {
      const teamIds = current.teamIds.includes(teamId)
        ? current.teamIds.filter((id) => id !== teamId)
        : [...current.teamIds, teamId];
      const next = { teamIds };
      void writeVault(user?.uid, next).catch(() =>
        setVaultError("Favoritos salvos apenas neste dispositivo."),
      );
      return next;
    });
  }
  if (isConfigured && (isAuthLoading || !user)) {
    return (
      <LoginScreen
        isConfigured={isConfigured}
        isLoading={isAuthLoading}
        error={authError}
        onSignIn={() => void signIn()}
      />
    );
  }
  if (dataError) {
    return (
      <main className="loading" role="alert">
        {dataError}
      </main>
    );
  }
  if (!data) return <main className="loading">Carregando seu Vault...</main>;
  const team = (id: string) => data.teams.find((item) => item.id === id)!;
  const league = (id: string) => data.leagues.find((item) => item.id === id)!;
  const upcoming = data.events.filter((event) => event.status === "scheduled");
  const favorites = data.teams.filter((item) =>
    vault.teamIds.includes(item.id),
  );
  const normalizedQuery = query.trim().toLowerCase();
  const filteredGames = data.events.filter((event) => {
    const competition = league(event.leagueId);
    return (gameSport === "all" || competition.sport === gameSport) && (gameStatus === "all" || event.status === gameStatus);
  });
  const searchResults = data.teams.filter((item) => {
    const competition = league(item.leagueId);
    const searchable = `${item.name} ${item.shortName} ${item.city} ${competition.name} ${competition.country}`.toLowerCase();
    return !normalizedQuery || searchable.includes(normalizedQuery);
  });
  const greeting = user?.displayName?.split(" ")[0] ?? "Leandro";
  const initials = (user?.displayName ?? "LD")
    .split(" ")
    .map((name) => name[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setView("home")}>
          <span className="brand-mark">
            <Trophy size={20} />
          </span>
          <span>
            Sports
            <br />
            <b>Vault</b>
          </span>
        </button>
        <nav aria-label="Navegação principal">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={view === id ? "nav-item active" : "nav-item"}
              onClick={() => setView(id)}
            >
              <Icon size={19} />
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <Compass size={18} />
          <span>
            Dados de demonstração
            <br />
            Provider mock ativo
          </span>
        </div>
      </aside>
      <main className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">SEU PAINEL ESPORTIVO</p>
            <h1>
              {view === "home"
                ? `Olá, ${greeting}.`
                : navigation.find((item) => item.id === view)?.label}
            </h1>
          </div>
          {user ? (
            <button
              className="profile"
              onClick={() => void signOut()}
              aria-label="Sair da conta"
              title="Sair da conta"
            >
              {initials}
              <LogOut size={14} />
            </button>
          ) : isConfigured ? (
            <button
              className="auth-button"
              disabled={isAuthLoading}
              onClick={() => void signIn()}
            >
              <LogIn size={16} />
              Entrar
            </button>
          ) : (
            <span className="demo-account">Modo demo</span>
          )}
        </header>
        {(authError || vaultError) && (
          <p className="sync-error" role="alert">
            {authError ?? vaultError}
          </p>
        )}
        {view === "home" && (
          <>
            <section className="hero-panel">
              <div>
                <p className="eyebrow">PRÓXIMO DESTAQUE</p>
                <h2>
                  Uma semana cheia
                  <br />
                  para acompanhar.
                </h2>
                <button
                  className="primary-button"
                  onClick={() => setView("games")}
                >
                  Ver agenda <ChevronRight size={17} />
                </button>
              </div>
              <div className="hero-stats">
                <span>
                  <b>{upcoming.length}</b> próximos jogos
                </span>
                <span>
                  <b>{favorites.length}</b> times salvos
                </span>
              </div>
            </section>
            <SectionTitle
              title="Próximos jogos"
              action="Agenda completa"
              onAction={() => setView("games")}
            />
            <div className="event-grid">
              {upcoming.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  home={team(event.homeTeamId)}
                  away={team(event.awayTeamId)}
                  competition={league(event.leagueId)}
                  onSelect={setSelectedEvent}
                />
              ))}
            </div>
            <SectionTitle
              title="Na sua biblioteca"
              action="Abrir Meu Vault"
              onAction={() => setView("vault")}
            />
            <div className="team-grid">
              {(favorites.length ? favorites : data.teams.slice(0, 4)).map(
                (item) => (
                  <TeamCard
                    key={item.id}
                    team={item}
                    league={league(item.leagueId)}
                    saved={vault.teamIds.includes(item.id)}
                    onToggle={toggleTeam}
                    onSelect={setSelectedTeam}
                  />
                ),
              )}
            </div>
          </>
        )}
        {view === "games" && (
          <>
            <div className="page-intro">
              <h2>Agenda e resultados</h2>
              <p>Partidas dos seus esportes e competições acompanhadas.</p>
            </div>
            <div className="filters" aria-label="Filtros de jogos">
              <label>Esporte<select value={gameSport} onChange={(event) => setGameSport(event.target.value as typeof gameSport)}><option value="all">Todos os esportes</option><option value="football">Futebol</option><option value="basketball">Basquete</option></select></label>
              <label>Status<select value={gameStatus} onChange={(event) => setGameStatus(event.target.value as typeof gameStatus)}><option value="all">Todos os jogos</option><option value="scheduled">Próximos</option><option value="finished">Resultados</option></select></label>
            </div>
            {filteredGames.length ? <div className="game-list">
              {filteredGames.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  home={team(event.homeTeamId)}
                  away={team(event.awayTeamId)}
                  competition={league(event.leagueId)}
                  onSelect={setSelectedEvent}
                />
              ))}
            </div> : <div className="empty-state"><Trophy size={25} /><h3>Nenhum jogo encontrado.</h3><p>Altere os filtros para ampliar a agenda.</p></div>}
          </>
        )}
        {view === "vault" && (
          <>
            <div className="page-intro">
              <h2>Meu Vault</h2>
              <p>Times escolhidos para a sua biblioteca.</p>
            </div>
            {favorites.length ? (
              <div className="team-grid">
                {favorites.map((item) => (
                  <TeamCard
                    key={item.id}
                    team={item}
                    league={league(item.leagueId)}
                    saved
                    onToggle={toggleTeam}
                    onSelect={setSelectedTeam}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Heart size={25} />
                <h3>Seu Vault está livre.</h3>
                <p>Salve times para criar uma agenda feita para você.</p>
                <button
                  className="primary-button"
                  onClick={() => setView("search")}
                >
                  Explorar times
                </button>
              </div>
            )}
          </>
        )}
        {view === "search" && (
          <>
            <div className="page-intro">
              <h2>Encontre para seguir</h2>
              <p>Explore times e competições disponíveis.</p>
            </div>
            <label className="search-box">
              <Search size={20} />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar time ou competição"
              />
            </label>
            <SectionTitle
              title={normalizedQuery ? "Resultados" : "Times em destaque"}
            />
            {searchResults.length ? <div className="team-grid">
              {searchResults.map((item) => (
                  <TeamCard
                    key={item.id}
                    team={item}
                    league={league(item.leagueId)}
                    saved={vault.teamIds.includes(item.id)}
                    onToggle={toggleTeam}
                    onSelect={setSelectedTeam}
                  />
                ))}
            </div> : <div className="empty-state"><Search size={25} /><h3>Nada encontrado.</h3><p>Busque por um time, cidade ou competição.</p></div>}
          </>
        )}
      </main>
      <nav className="mobile-nav" aria-label="Navegação móvel">
        {navigation.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={view === id ? "active" : ""}
            onClick={() => setView(id)}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {(selectedTeam || selectedEvent) && <DetailDialog team={selectedTeam} event={selectedEvent} getTeam={team} getLeague={league} onClose={() => { setSelectedTeam(null); setSelectedEvent(null); }} />}
    </div>
  );
}
function SectionTitle({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {action && (
        <button onClick={onAction}>
          {action}
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}
function TeamCard({
  team,
  league,
  saved,
  onToggle,
  onSelect,
}: {
  team: Team;
  league: League;
  saved: boolean;
  onToggle: (id: string) => void;
  onSelect: (team: Team) => void;
}) {
  return (
    <article className="team-card">
      <div className="team-card-top">
        <span className="crest" style={{ backgroundColor: team.color }}>
          {team.shortName.slice(0, 2)}
        </span>
        <button
          className={saved ? "heart saved" : "heart"}
          onClick={() => onToggle(team.id)}
          aria-label={saved ? `Remover ${team.name}` : `Salvar ${team.name}`}
        >
          <Heart size={18} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
      <button className="team-detail-button" onClick={() => onSelect(team)}>{team.name}</button>
      <p>{team.city}</p>
      <span
        className="competition-dot"
        style={{ "--league-color": league.color } as React.CSSProperties}
      >
        {league.name}
      </span>
    </article>
  );
}
function DetailDialog({ team, event, getTeam, getLeague, onClose }: { team: Team | null; event: SportEvent | null; getTeam: (id: string) => Team; getLeague: (id: string) => League; onClose: () => void }) {
  const selectedTeam = team ?? (event ? getTeam(event.homeTeamId) : null);
  const competition = selectedTeam ? getLeague(selectedTeam.leagueId) : event ? getLeague(event.leagueId) : null;
  const home = event ? getTeam(event.homeTeamId) : null;
  const away = event ? getTeam(event.awayTeamId) : null;
  return <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}><section className="detail-dialog" role="dialog" aria-modal="true" aria-labelledby="detail-title" onMouseDown={(mouseEvent) => mouseEvent.stopPropagation()}><button className="dialog-close" onClick={onClose} aria-label="Fechar detalhes">×</button>{team && <><span className="crest detail-crest" style={{ backgroundColor: team.color }}>{team.shortName.slice(0, 2)}</span><p className="eyebrow">{competition?.name}</p><h2 id="detail-title">{team.name}</h2><p className="detail-copy">{team.city} · {competition?.country} · {competition?.season}</p></>}{event && <><p className="eyebrow">{competition?.name}</p><h2 id="detail-title">{home?.name} <span>vs</span> {away?.name}</h2><p className="detail-copy">{event.status === "finished" ? `${event.homeScore} - ${event.awayScore} · Encerrado` : new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeStyle: "short", timeZone: "UTC" }).format(new Date(event.startsAt))}</p><p className="detail-venue"><CalendarDays size={16} />{event.venue}</p></>}</section></div>
}
function EventCard({
  event,
  home,
  away,
  competition,
  onSelect,
}: {
  event: SportEvent;
  home: Team;
  away: Team;
  competition: League;
  onSelect?: (event: SportEvent) => void;
}) {
  const date = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(event.startsAt));
  return (
    <article className={onSelect ? "event-card selectable" : "event-card"} onClick={() => onSelect?.(event)} onKeyDown={(keyEvent) => { if (onSelect && (keyEvent.key === "Enter" || keyEvent.key === " ")) onSelect(event); }} role={onSelect ? "button" : undefined} tabIndex={onSelect ? 0 : undefined}>
      <div className="event-meta">
        <span>{competition.name}</span>
        <span
          className={event.status === "finished" ? "status finished" : "status"}
        >
          {event.status === "finished" ? "Encerrado" : date}
        </span>
      </div>
      <div className="matchup">
        <div>
          <span className="mini-crest" style={{ backgroundColor: home.color }}>
            {home.shortName.slice(0, 2)}
          </span>
          <b>{home.name}</b>
        </div>
        <strong>
          {event.status === "finished"
            ? `${event.homeScore} - ${event.awayScore}`
            : "vs"}
        </strong>
        <div>
          <span className="mini-crest" style={{ backgroundColor: away.color }}>
            {away.shortName.slice(0, 2)}
          </span>
          <b>{away.name}</b>
        </div>
      </div>
      <p className="venue">
        <CalendarDays size={14} />
        {event.venue}
      </p>
    </article>
  );
}
export default App;
