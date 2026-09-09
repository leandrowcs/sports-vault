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
  Player,
  SportCode,
  SportEvent,
  Team,
  VaultState,
  View,
} from "./types/sports";
interface SportsData {
  leagues: League[];
  teams: Team[];
  events: SportEvent[];
  players: Player[];
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
  const [gameSport, setGameSport] = useState<"all" | "football" | "basketball" | "american_football">("all");
  const [gameStatus, setGameStatus] = useState<"all" | "scheduled" | "live" | "finished">("all");
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<SportEvent | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [headToHead, setHeadToHead] = useState<{ teamAId: string; teamBId: string } | null>(null);
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
      sportsService.getPlayers(),
    ])
      .then(([leagues, teams, events, players]) => setData({ leagues, teams, events, players }))
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
        setSelectedPlayer(null);
        setHeadToHead(null);
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
      const next = { ...current, teamIds };
      void writeVault(user?.uid, next).catch(() =>
        setVaultError("Favoritos salvos apenas neste dispositivo."),
      );
      return next;
    });
  }
  function completeOnboarding(teamIds: string[]) {
    setVault((current) => {
      const next = { teamIds: [...new Set([...current.teamIds, ...teamIds])], onboarded: true };
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
  if (!vault.onboarded) {
    return (
      <OnboardingScreen
        leagues={data.leagues}
        teams={data.teams}
        players={data.players}
        onFinish={completeOnboarding}
      />
    );
  }
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
              <label>Esporte<select value={gameSport} onChange={(event) => setGameSport(event.target.value as typeof gameSport)}><option value="all">Todos os esportes</option><option value="football">Futebol</option><option value="basketball">Basquete</option><option value="american_football">NFL</option></select></label>
              <label>Status<select value={gameStatus} onChange={(event) => setGameStatus(event.target.value as typeof gameStatus)}><option value="all">Todos os jogos</option><option value="live">Ao vivo</option><option value="scheduled">Próximos</option><option value="finished">Resultados</option></select></label>
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
      {(selectedTeam || selectedEvent) && (
        <DetailDialog
          team={selectedTeam}
          event={selectedEvent}
          players={data.players}
          teams={data.teams}
          getTeam={team}
          getLeague={league}
          onSelectPlayer={setSelectedPlayer}
          onCompare={(teamAId, teamBId) => setHeadToHead({ teamAId, teamBId })}
          onClose={() => {
            setSelectedTeam(null);
            setSelectedEvent(null);
          }}
        />
      )}
      {selectedPlayer && (
        <PlayerDialog
          player={selectedPlayer}
          team={team(selectedPlayer.teamId)}
          getLeague={league}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
      {headToHead && (
        <HeadToHeadDialog
          teamA={team(headToHead.teamAId)}
          teamB={team(headToHead.teamBId)}
          events={data.events}
          onClose={() => setHeadToHead(null)}
        />
      )}
    </div>
  );
}
const onboardingSports: { id: SportCode; label: string }[] = [
  { id: "football", label: "Futebol" },
  { id: "basketball", label: "NBA" },
  { id: "american_football", label: "NFL" },
];
function OnboardingScreen({
  leagues,
  teams,
  players,
  onFinish,
}: {
  leagues: League[];
  teams: Team[];
  players: Player[];
  onFinish: (teamIds: string[]) => void;
}) {
  const [selectedSports, setSelectedSports] = useState<Set<SportCode>>(
    new Set(onboardingSports.map((option) => option.id)),
  );
  const [query, setQuery] = useState("");
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());

  function toggleSport(sport: SportCode) {
    setSelectedSports((current) => {
      const next = new Set(current);
      if (next.has(sport)) next.delete(sport);
      else next.add(sport);
      return next;
    });
  }
  function toggleTeamSelection(id: string) {
    setSelectedTeamIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const leagueById = (id: string) => leagues.find((item) => item.id === id)!;
  const normalizedQuery = query.trim().toLowerCase();
  const suggested = teams.filter((item) => {
    const competition = leagueById(item.leagueId);
    if (!selectedSports.has(competition.sport)) return false;
    if (!normalizedQuery) return true;
    return `${item.name} ${item.city} ${competition.name}`.toLowerCase().includes(normalizedQuery);
  });
  const trendingPlayers = players.slice(0, 4);

  return (
    <div className="onboarding-screen">
      <div className="onboarding-content">
        <p className="eyebrow">CUSTOMIZE SEU VAULT</p>
        <h1>Escolha seus times e ligas</h1>
        <p className="onboarding-copy">
          Selecione as modalidades e times para calibrar seu feed.
        </p>
        <div className="sport-toggle-group">
          {onboardingSports.map((option) => (
            <button
              key={option.id}
              className={selectedSports.has(option.id) ? "sport-toggle active" : "sport-toggle"}
              onClick={() => toggleSport(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <label className="search-box onboarding-search">
          <Search size={20} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar time ou competição"
          />
        </label>
        <div className="team-grid">
          {suggested.map((item) => {
            const following = selectedTeamIds.has(item.id);
            return (
              <article key={item.id} className="team-card">
                <div className="team-card-top">
                  <span className="crest" style={{ backgroundColor: item.color }}>
                    {item.shortName.slice(0, 2)}
                  </span>
                </div>
                <p className="onboarding-team-name">{item.name}</p>
                <p>{item.city}</p>
                <button
                  className={following ? "onboarding-follow following" : "onboarding-follow"}
                  onClick={() => toggleTeamSelection(item.id)}
                >
                  {following ? "Seguindo" : "Adicionar"}
                </button>
              </article>
            );
          })}
          {!suggested.length && (
            <div className="empty-state">
              <Search size={25} />
              <h3>Nada encontrado.</h3>
              <p>Ajuste os filtros de modalidade ou a busca.</p>
            </div>
          )}
        </div>
        {trendingPlayers.length > 0 && (
          <>
            <h2 className="onboarding-subtitle">Em alta nas últimas 24h</h2>
            <div className="trending-row">
              {trendingPlayers.map((player) => (
                <span key={player.id} className="trending-chip">
                  {player.name}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="onboarding-bar">
        <span>{selectedTeamIds.size} times selecionados</span>
        <button className="primary-button" onClick={() => onFinish([...selectedTeamIds])}>
          Continuar <ChevronRight size={17} />
        </button>
      </div>
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
function DetailDialog({ team, event, players, teams, getTeam, getLeague, onSelectPlayer, onCompare, onClose }: { team: Team | null; event: SportEvent | null; players: Player[]; teams: Team[]; getTeam: (id: string) => Team; getLeague: (id: string) => League; onSelectPlayer: (player: Player) => void; onCompare: (teamAId: string, teamBId: string) => void; onClose: () => void }) {
  const selectedTeam = team ?? (event ? getTeam(event.homeTeamId) : null);
  const competition = selectedTeam ? getLeague(selectedTeam.leagueId) : event ? getLeague(event.leagueId) : null;
  const home = event ? getTeam(event.homeTeamId) : null;
  const away = event ? getTeam(event.awayTeamId) : null;
  const roster = team ? players.filter((player) => player.teamId === team.id) : [];
  const rivals = team ? teams.filter((item) => item.leagueId === team.leagueId && item.id !== team.id) : [];
  const [rivalId, setRivalId] = useState(rivals[0]?.id ?? "");
  return <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}><section className="detail-dialog" role="dialog" aria-modal="true" aria-labelledby="detail-title" onMouseDown={(mouseEvent) => mouseEvent.stopPropagation()}><button className="dialog-close" onClick={onClose} aria-label="Fechar detalhes">×</button>{team && <><span className="crest detail-crest" style={{ backgroundColor: team.color }}>{team.shortName.slice(0, 2)}</span><p className="eyebrow">{competition?.name}</p><h2 id="detail-title">{team.name}</h2><p className="detail-copy">{team.city} · {competition?.country} · {competition?.season}</p>{roster.length > 0 && <ul className="roster-list">{roster.map((player) => (<li key={player.id}><button className="roster-item" onClick={() => onSelectPlayer(player)}>{player.name}<span>{player.position}</span></button></li>))}</ul>}{rivals.length > 0 && <div className="compare-box"><label>Comparar com<select value={rivalId} onChange={(changeEvent) => setRivalId(changeEvent.target.value)}>{rivals.map((rival) => (<option key={rival.id} value={rival.id}>{rival.name}</option>))}</select></label><button className="primary-button" onClick={() => rivalId && onCompare(team.id, rivalId)}>Ver Head-to-Head <ChevronRight size={16} /></button></div>}</>}{event && <><p className="eyebrow">{competition?.name}</p><h2 id="detail-title">{home?.name} <span>vs</span> {away?.name}</h2><p className="detail-copy">{event.status === "finished" ? `${event.homeScore} - ${event.awayScore} · Encerrado` : event.status === "live" ? `${event.homeScore ?? 0} - ${event.awayScore ?? 0} · Ao vivo` : new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeStyle: "short", timeZone: "UTC" }).format(new Date(event.startsAt))}</p><p className="detail-venue"><CalendarDays size={16} />{event.venue}</p></>}</section></div>
}
function PlayerDialog({ player, team, getLeague, onClose }: { player: Player; team: Team; getLeague: (id: string) => League; onClose: () => void }) {
  const [seasonIndex, setSeasonIndex] = useState(0);
  const stats = player.seasons[seasonIndex] ?? player.seasons[0];
  const competition = stats ? getLeague(stats.competitionId) : null;
  const marketValue = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(player.marketValueEUR);
  const metrics = stats
    ? [
        { label: "Gols", value: stats.goals },
        { label: "Assistências", value: stats.assists },
        { label: "xG", value: stats.xG.toFixed(1) },
        { label: "Dribles/jogo", value: stats.dribblesPerGame.toFixed(1) },
        { label: "Vel. máxima", value: `${stats.topSpeedKmh.toFixed(1)} km/h` },
      ]
    : [];
  const percentiles = stats
    ? [
        { label: "Gols", value: stats.percentiles.goals },
        { label: "Assistências", value: stats.percentiles.assists },
        { label: "xG", value: stats.percentiles.xG },
        { label: "Dribles", value: stats.percentiles.dribbles },
        { label: "Velocidade", value: stats.percentiles.speed },
      ]
    : [];
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="detail-dialog player-dialog" role="dialog" aria-modal="true" aria-labelledby="player-title" onMouseDown={(mouseEvent) => mouseEvent.stopPropagation()}>
        <button className="dialog-close" onClick={onClose} aria-label="Fechar ficha do atleta">×</button>
        <span className="crest detail-crest" style={{ backgroundColor: team.color }}>{team.shortName.slice(0, 2)}</span>
        <p className="eyebrow">{player.position} · {team.name}</p>
        <h2 id="player-title">{player.name}</h2>
        <p className="detail-copy">{player.age} anos · {player.nationality} · Valor de mercado {marketValue}</p>
        {player.seasons.length > 1 && (
          <label className="season-select">
            Temporada
            <select value={seasonIndex} onChange={(event) => setSeasonIndex(Number(event.target.value))}>
              {player.seasons.map((season, index) => (
                <option key={`${season.season}-${season.competitionId}`} value={index}>
                  {season.season} · {getLeague(season.competitionId).name}
                </option>
              ))}
            </select>
          </label>
        )}
        {stats && (
          <>
            <p className="detail-copy">{competition?.name} · {stats.appearances} jogos</p>
            <div className="stat-grid">
              {metrics.map((metric) => (
                <div key={metric.label} className="stat-cell">
                  <b>{metric.value}</b>
                  <span>{metric.label}</span>
                </div>
              ))}
            </div>
            <h3 className="player-section-title">Desempenho recente</h3>
            <div className="rating-bars">
              {stats.recentRatings.map((rating, index) => (
                <div key={index} className="rating-bar">
                  <span className="rating-bar-fill" style={{ height: `${(rating / 10) * 100}%` }} />
                  <b>{rating.toFixed(1)}</b>
                </div>
              ))}
            </div>
            <h3 className="player-section-title">Percentil vs. mesma posição</h3>
            <div className="percentile-list">
              {percentiles.map((item) => (
                <div key={item.label} className="percentile-row">
                  <span>{item.label}</span>
                  <div className="percentile-track">
                    <div className="percentile-fill" style={{ width: `${item.value}%` }} />
                  </div>
                  <b>{item.value}</b>
                </div>
              ))}
            </div>
          </>
        )}
        {player.titles.length > 0 && (
          <>
            <h3 className="player-section-title">Títulos</h3>
            <ul className="titles-list">
              {player.titles.map((title) => (
                <li key={title}>{title}</li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
type H2HFilter = "last5" | "all";
function HeadToHeadDialog({ teamA, teamB, events, onClose }: { teamA: Team; teamB: Team; events: SportEvent[]; onClose: () => void }) {
  const [filter, setFilter] = useState<H2HFilter>("last5");
  const meetings = events
    .filter(
      (event) =>
        event.status === "finished" &&
        ((event.homeTeamId === teamA.id && event.awayTeamId === teamB.id) ||
          (event.homeTeamId === teamB.id && event.awayTeamId === teamA.id)),
    )
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
  const tally = (list: SportEvent[]) =>
    list.reduce(
      (acc, event) => {
        const scoreA = event.homeTeamId === teamA.id ? event.homeScore ?? 0 : event.awayScore ?? 0;
        const scoreB = event.homeTeamId === teamB.id ? event.homeScore ?? 0 : event.awayScore ?? 0;
        if (scoreA > scoreB) acc.winsA += 1;
        else if (scoreB > scoreA) acc.winsB += 1;
        else acc.draws += 1;
        acc.pointsA += scoreA;
        acc.pointsB += scoreB;
        return acc;
      },
      { winsA: 0, winsB: 0, draws: 0, pointsA: 0, pointsB: 0 },
    );
  const overall = tally(meetings);
  const filtered = filter === "last5" ? meetings.slice(0, 5) : meetings;
  const total = overall.winsA + overall.winsB + overall.draws;
  const probabilityA = total > 0 ? Math.round((overall.winsA / total) * 100) : 50;
  const avgA = meetings.length ? (overall.pointsA / meetings.length).toFixed(1) : "0.0";
  const avgB = meetings.length ? (overall.pointsB / meetings.length).toFixed(1) : "0.0";
  const maxAvg = Math.max(Number(avgA), Number(avgB), 1);
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="detail-dialog h2h-dialog" role="dialog" aria-modal="true" aria-labelledby="h2h-title" onMouseDown={(mouseEvent) => mouseEvent.stopPropagation()}>
        <button className="dialog-close" onClick={onClose} aria-label="Fechar comparação">×</button>
        <p className="eyebrow">Head-to-Head Vault</p>
        <h2 id="h2h-title" className="h2h-title">
          <span className="crest" style={{ backgroundColor: teamA.color }}>{teamA.shortName.slice(0, 2)}</span>
          {teamA.name} <span>vs</span> {teamB.name}
          <span className="crest" style={{ backgroundColor: teamB.color }}>{teamB.shortName.slice(0, 2)}</span>
        </h2>
        <p className="detail-copy">
          {meetings.length} confrontos · {overall.winsA} vitórias {teamA.shortName} · {overall.draws} empates · {overall.winsB} vitórias {teamB.shortName}
        </p>
        <div className="h2h-filters" role="tablist" aria-label="Filtro temporal">
          {(["last5", "all"] as const).map((option) => (
            <button
              key={option}
              className={filter === option ? "h2h-filter active" : "h2h-filter"}
              onClick={() => setFilter(option)}
              role="tab"
              aria-selected={filter === option}
            >
              {option === "last5" ? "Últimos 5 Jogos" : "Todos os Tempos"}
            </button>
          ))}
        </div>
        <h3 className="player-section-title">Telemetria comparativa (média por jogo)</h3>
        <div className="h2h-telemetry">
          <div className="h2h-telemetry-row">
            <span>{teamA.shortName}</span>
            <div className="percentile-track"><div className="percentile-fill" style={{ width: `${(Number(avgA) / maxAvg) * 100}%`, backgroundColor: teamA.color }} /></div>
            <b>{avgA}</b>
          </div>
          <div className="h2h-telemetry-row">
            <span>{teamB.shortName}</span>
            <div className="percentile-track"><div className="percentile-fill" style={{ width: `${(Number(avgB) / maxAvg) * 100}%`, backgroundColor: teamB.color }} /></div>
            <b>{avgB}</b>
          </div>
        </div>
        <h3 className="player-section-title">Histórico de confrontos</h3>
        {filtered.length ? (
          <ul className="h2h-history">
            {filtered.map((event) => {
              const scoreA = event.homeTeamId === teamA.id ? event.homeScore ?? 0 : event.awayScore ?? 0;
              const scoreB = event.homeTeamId === teamB.id ? event.homeScore ?? 0 : event.awayScore ?? 0;
              return (
                <li key={event.id}>
                  <span>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(event.startsAt))}</span>
                  <b>{scoreA} - {scoreB}</b>
                  <span>{event.venue}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="detail-copy">Nenhum confronto registrado neste recorte.</p>
        )}
        <h3 className="player-section-title">Módulo preditivo do Vault</h3>
        <div className="h2h-prediction">
          <div className="percentile-track"><div className="percentile-fill" style={{ width: `${probabilityA}%` }} /></div>
          <p className="detail-copy">{teamA.shortName} {probabilityA}% · {teamB.shortName} {100 - probabilityA}% de probabilidade de vitória, com base no retrospecto histórico.</p>
        </div>
      </section>
    </div>
  );
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
        {event.status === "live" ? (
          <span className="status live">
            <span className="live-dot" />
            AO VIVO
          </span>
        ) : (
          <span className={event.status === "finished" ? "status finished" : "status"}>
            {event.status === "finished" ? "Encerrado" : date}
          </span>
        )}
      </div>
      <div className="matchup">
        <div>
          <span className="mini-crest" style={{ backgroundColor: home.color }}>
            {home.shortName.slice(0, 2)}
          </span>
          <b>{home.name}</b>
        </div>
        <strong>
          {event.status === "scheduled"
            ? "vs"
            : `${event.homeScore ?? 0} - ${event.awayScore ?? 0}`}
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
