import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  Bot,
  CalendarDays,
  ChevronLeft,
  Check,
  ChevronRight,
  CircleUserRound,
  Compass,
  Download,
  Heart,
  Home,
  LogIn,
  LogOut,
  MapPin,
  Medal,
  Menu,
  MoreVertical,
  Plus,
  Shield,
  Search,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trophy,
  UsersRound,
  X,
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
  EventSummaryLeader,
  EventSummaryStat,
  League,
  GameStatus,
  Player,
  SportCode,
  SportEvent,
  SportEventSummary,
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
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}
const navigation: { id: View; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Início", icon: Home },
  { id: "vault", label: "Meu Vault", icon: Heart },
  { id: "games", label: "Jogos", icon: Trophy },
  { id: "search", label: "Buscar", icon: Search },
];

const eventCardDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

const eventDetailDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: "UTC",
});

function formatEventCardDate(startsAt: string) {
  return eventCardDateFormatter.format(new Date(startsAt));
}

function formatEventDetailDate(startsAt: string) {
  return eventDetailDateFormatter.format(new Date(startsAt));
}

function formatEventDetailStatus(event: SportEvent) {
  const score = `${event.homeScore ?? 0} - ${event.awayScore ?? 0}`;
  const dateLabel = formatEventDetailDate(event.startsAt);

  if (event.status === "finished") return `${score} · ${dateLabel}`;
  if (event.status === "live") return `${score} · Ao vivo · ${dateLabel}`;
  return dateLabel;
}
function App() {
  const [view, setView] = useState<View>("home");
  const [data, setData] = useState<SportsData | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [vault, setVault] = useState<VaultState>(readLocalVault);
  const [query, setQuery] = useState("");
  const [gameSport, setGameSport] = useState<"all" | "football" | "basketball" | "american_football">("all");
  const [gameStatus, setGameStatus] = useState<"all" | "scheduled" | "live" | "finished">("all");
  const [teamPage, setTeamPage] = useState<Team | null>(null);
  const [playerPage, setPlayerPage] = useState<Player | null>(null);
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
    if (!user) return;

    return (
      subscribeToCloudVault(
        user.uid,
        (cloudVault, exists) => {
          // Doc not created yet: keep local state, the next write (toggle/onboarding) will create it.
          if (!exists) return;
          setVault(cloudVault);
        },
        () => setVaultError("Favoritos salvos apenas neste dispositivo."),
      ) ?? undefined
    );
  }, [user]);
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPlayerPage(null);
        setTeamPage(null);
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
        {!teamPage && !playerPage && <header className="topbar">
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
        </header>}
        {(authError || vaultError) && (
          <p className="sync-error" role="alert">
            {authError ?? vaultError}
          </p>
        )}
        {playerPage ? (
          <PlayerVaultPage
            player={playerPage}
            team={team(playerPage.teamId)}
            league={league(team(playerPage.teamId).leagueId)}
            onBack={() => setPlayerPage(null)}
            onOpenGames={() => {
              setPlayerPage(null);
              setTeamPage(null);
              setView("games");
            }}
            onOpenVault={() => {
              setPlayerPage(null);
              setTeamPage(null);
              setView("vault");
            }}
            onOpenSearch={() => {
              setPlayerPage(null);
              setTeamPage(null);
              setView("search");
            }}
          />
        ) : teamPage ? (
          <TeamVaultPage
            team={teamPage}
            league={league(teamPage.leagueId)}
            events={data.events.filter((event) => event.homeTeamId === teamPage.id || event.awayTeamId === teamPage.id)}
            players={data.players.filter((player) => player.teamId === teamPage.id)}
            teams={data.teams}
            getTeam={team}
            saved={vault.teamIds.includes(teamPage.id)}
            onBack={() => setTeamPage(null)}
            onToggleFavorite={() => toggleTeam(teamPage.id)}
            onOpenGames={() => {
              setTeamPage(null);
              setView("games");
            }}
            onOpenVault={() => {
              setTeamPage(null);
              setView("vault");
            }}
            onOpenSearch={() => {
              setTeamPage(null);
              setView("search");
            }}
            onSelectPlayer={setPlayerPage}
          />
        ) : view === "home" && (
          <VaultFeedHome
            events={data.events}
            favorites={favorites}
            players={data.players}
            getTeam={team}
            getLeague={league}
            onOpenGames={() => setView("games")}
            onOpenFavorites={() => setView("vault")}
            onOpenSearch={() => setView("search")}
            onOpenVault={() => setView("home")}
            onSelectEvent={setSelectedEvent}
          />
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
                    onSelect={setTeamPage}
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
                    onSelect={setTeamPage}
                  />
                ))}
            </div> : <div className="empty-state"><Search size={25} /><h3>Nada encontrado.</h3><p>Busque por um time, cidade ou competição.</p></div>}
          </>
        )}
      </main>
      <AppBottomNav
        active={view === "games" ? "games" : view === "search" ? "explore" : view === "vault" ? "favorites" : "vault"}
        className="mobile-nav"
        onOpenGames={() => setView("games")}
        onOpenVault={() => setView("home")}
        onOpenSearch={() => setView("search")}
        onOpenFavorites={() => setView("vault")}
      />
      {(selectedTeam || selectedEvent) && (
        <DetailDialog
          team={selectedTeam}
          event={selectedEvent}
          players={data.players}
          teams={data.teams}
          getTeam={team}
          getLeague={league}
          onSelectPlayer={(player) => {
            setSelectedTeam(null);
            setSelectedEvent(null);
            setPlayerPage(player);
          }}
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
      <InstallAppPrompt />
    </div>
  );
}
function InstallAppPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = useState(
    () => localStorage.getItem("sports-vault:install-dismissed") === "true",
  );
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        ("standalone" in window.navigator && window.navigator.standalone === true),
    );

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  function dismiss() {
    localStorage.setItem("sports-vault:install-dismissed", "true");
    setIsDismissed(true);
  }

  if (isStandalone || isDismissed || !installPrompt) return null;

  return (
    <aside className="install-app-prompt" aria-label="Instalar Sports Vault">
      <div>
        <Download size={18} />
        <span>
          <b>Instalar Sports Vault</b>
          <small>Acesse como app local, com cache e tela cheia.</small>
        </span>
      </div>
      <button className="install-action" onClick={() => void installApp()}>
        Instalar
      </button>
      <button className="install-dismiss" onClick={dismiss} aria-label="Fechar sugestão de instalação">
        <X size={16} />
      </button>
    </aside>
  );
}
type BottomNavItem = "vault" | "games" | "explore" | "favorites" | "profile";
function AppBottomNav({
  active,
  className = "",
  onOpenFavorites,
  onOpenGames,
  onOpenSearch,
  onOpenVault,
  onOpenProfile,
}: {
  active: BottomNavItem;
  className?: string;
  onOpenFavorites: () => void;
  onOpenGames: () => void;
  onOpenSearch: () => void;
  onOpenVault: () => void;
  onOpenProfile?: () => void;
}) {
  const items: { id: BottomNavItem; label: string; icon: typeof Shield; onClick: () => void }[] = [
    { id: "vault", label: "Vault", icon: Shield, onClick: onOpenVault },
    { id: "games", label: "Jogos", icon: Trophy, onClick: onOpenGames },
    { id: "explore", label: "Explorar", icon: Search, onClick: onOpenSearch },
    { id: "favorites", label: "Favoritos", icon: Star, onClick: onOpenFavorites },
    { id: "profile", label: "Perfil", icon: CircleUserRound, onClick: onOpenProfile ?? onOpenVault },
  ];

  return (
    <nav className={`app-bottom-nav ${className}`.trim()} aria-label="Navegação principal">
      {items.map(({ id, label, icon: Icon, onClick }) => (
        <button key={id} className={active === id ? "active" : ""} onClick={onClick}>
          <Icon size={20} fill={active === id && (id === "vault" || id === "favorites") ? "currentColor" : "none"} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
const onboardingSports: { id: SportCode; label: string }[] = [
  { id: "football", label: "Futebol" },
  { id: "basketball", label: "NBA" },
  { id: "american_football", label: "NFL" },
];
const sportDescriptions: Record<SportCode, string> = {
  american_football: "Playoffs & Live Ops",
  basketball: "Conferências & Stats",
  football: "UCL & Brasileirão",
};
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
  const selectedCount = selectedTeamIds.size + selectedSports.size;

  return (
    <div className="onboarding-screen">
      <div className="onboarding-aura primary" />
      <div className="onboarding-aura secondary" />
      <header className="onboarding-header">
        <div className="onboarding-header-row">
          <div className="step-pill">
            <span />
            Passo 1 de 3
          </div>
          <button type="button" onClick={() => onFinish([])}>
            Pular
          </button>
        </div>
        <div className="onboarding-progress" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </header>
      <div className="onboarding-content">
        <h1>
          Construa o seu <span>Sports Vault</span>
        </h1>
        <p className="onboarding-copy">
          Escolha os esportes, times e atletas para um feed de dados 100% sob medida.
        </p>

        <section className="onboarding-section">
          <div className="onboarding-section-title">
            <span>Modalidades Principais</span>
            <b>{selectedSports.size} ativas</b>
          </div>
          <div className="sport-card-grid">
            {onboardingSports.map((option) => (
              <SportChoiceCard
                key={option.id}
                active={selectedSports.has(option.id)}
                label={option.label}
                description={sportDescriptions[option.id]}
                onClick={() => toggleSport(option.id)}
              />
            ))}
          </div>
        </section>

        <label className="onboarding-search-box">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar times, franquias ou ligas..."
          />
          <button type="button" aria-label="Filtros">
            <SlidersHorizontal size={17} />
          </button>
        </label>

        <section className="onboarding-section">
          <div className="onboarding-section-title">
            <div>
              <i />
              <h2>Times Sugeridos para Você</h2>
            </div>
            <span>{selectedTeamIds.size} seguidos</span>
          </div>
          <div className="onboarding-team-grid">
            {suggested.slice(0, 6).map((item) => (
              <OnboardingTeamCard
                key={item.id}
                team={item}
                league={leagueById(item.leagueId)}
                selected={selectedTeamIds.has(item.id)}
                onToggle={() => toggleTeamSelection(item.id)}
              />
            ))}
            {!suggested.length && (
              <div className="empty-state onboarding-empty">
                <Search size={25} />
                <h3>Nada encontrado.</h3>
                <p>Ajuste os filtros de modalidade ou a busca.</p>
              </div>
            )}
          </div>
        </section>

        <section className="onboarding-section onboarding-athletes-section">
          <div className="onboarding-section-title">
            <div>
              <i />
              <h2>Atletas em Alta</h2>
            </div>
            <span>Radar 24h</span>
          </div>
          <div className="onboarding-athlete-list">
            {trendingPlayers.length ? trendingPlayers.map((player, index) => (
              <OnboardingAthleteRow
                key={player.id}
                player={player}
                team={teams.find((item) => item.id === player.teamId)}
                vaulted={index < 3}
              />
            )) : (
              <div className="empty-state onboarding-empty">
                <Search size={25} />
                <h3>Nenhum atleta em alta.</h3>
                <p>Escolha times para calibrar o radar.</p>
              </div>
            )}
          </div>
        </section>
      </div>
      <div className="onboarding-bar">
        <button className="onboarding-cta" onClick={() => onFinish([...selectedTeamIds])}>
          <span>Entrar no Vault</span>
          <b>{selectedCount} selecionados</b>
          <ArrowRight size={19} />
        </button>
        <p>Você poderá ajustar suas preferências e alertas a qualquer momento.</p>
      </div>
    </div>
  );
}
function SportChoiceCard({ active, label, description, onClick }: { active: boolean; label: string; description: string; onClick: () => void }) {
  return (
    <button type="button" className={active ? "sport-choice-card active" : "sport-choice-card"} onClick={onClick}>
      <div>
        <span><Trophy size={18} /></span>
        {active && <Check size={18} />}
      </div>
      <b>{label}</b>
      <small>{description}</small>
    </button>
  );
}
function OnboardingTeamCard({ team, league, selected, onToggle }: { team: Team; league: League; selected: boolean; onToggle: () => void }) {
  return (
    <article className={selected ? "onboarding-team-card selected" : "onboarding-team-card"}>
      <div>
        <span style={{ backgroundColor: team.color }}>{team.shortName}</span>
        <button type="button" onClick={onToggle} aria-label={selected ? `Remover ${team.name}` : `Adicionar ${team.name}`}>
          {selected ? <><Check size={14} /><b>Seguindo</b></> : <Plus size={16} />}
        </button>
      </div>
      <h3>{team.name}</h3>
      <p>{league.name} · {league.country}</p>
    </article>
  );
}
function OnboardingAthleteRow({ player, team, vaulted }: { player: Player; team?: Team; vaulted: boolean }) {
  const initials = player.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <article className={vaulted ? "onboarding-athlete-row vaulted" : "onboarding-athlete-row"}>
      <div>
        <span>{initials}</span>
        <div>
          <h3>{player.name}</h3>
          <p>{team?.name ?? "Sports Vault"} · <b>{player.position}</b></p>
        </div>
      </div>
      <button type="button">
        {vaulted ? <><Check size={15} /><span>Vaulted</span></> : <><Plus size={15} /><span>Adicionar</span></>}
      </button>
    </article>
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
function VaultFeedHome({
  events,
  favorites,
  players,
  getTeam,
  getLeague,
  onOpenGames,
  onOpenFavorites,
  onOpenVault,
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
  const featuredLeague = featuredTeam ? getLeague(featuredTeam.leagueId) : null;
  const topFootballTeams = favorites.length ? favorites.slice(0, 3) : featuredEvents.map((event) => getTeam(event.homeTeamId)).slice(0, 3);
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
          <Shield size={20} className="vault-shield" fill="currentColor" />
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
          <span>{Math.max(liveEvents.length, 1)} ativos</span>
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
            <h2>Classificações Rápidas</h2>
          </div>
          <button onClick={onOpenGames}>
            Ver tabela completa <ChevronRight size={14} />
          </button>
        </div>
        <div className="standings-card">
          <MiniStanding title={featuredLeague?.name ?? "Vault League"} teams={topFootballTeams} />
          <MiniStanding title="Favoritos" teams={favorites.slice(0, 3)} emptyText="Nenhum favorito salvo" />
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

      <AppBottomNav
        active="vault"
        onOpenFavorites={onOpenFavorites}
        onOpenGames={onOpenGames}
        onOpenSearch={onOpenSearch}
        onOpenVault={onOpenVault}
      />
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
  const possession = Math.min(68, Math.max(38, 50 + (home.shortName.length - away.shortName.length) * 4));

  return (
    <article className="featured-match-card" onClick={() => onSelect(event)}>
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
        <div className="match-meter-box">
          <div className="meter-labels">
            <span>{possession}%</span>
            <span>Posse de bola</span>
            <span>{100 - possession}%</span>
          </div>
          <div className="split-meter">
            <span style={{ width: `${possession}%`, backgroundColor: home.color }} />
            <span style={{ width: `${100 - possession}%`, backgroundColor: away.color }} />
          </div>
        </div>
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
function MiniStanding({ title, teams, emptyText = "Sem dados" }: { title: string; teams: Team[]; emptyText?: string }) {
  return (
    <div className="mini-standing">
      <header>
        <span>{title}</span>
        <small>P • J • SG</small>
      </header>
      {teams.length ? (
        teams.map((team, index) => (
          <div key={team.id} className="standing-row">
            <span>{index + 1}</span>
            <b>{team.name}</b>
            <small>{34 - index * 4}</small>
            <small>{14 - index}</small>
            <small>+{18 - index * 5}</small>
          </div>
        ))
      ) : (
        <p className="standing-empty">{emptyText}</p>
      )}
    </div>
  );
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
function PlayerVaultPage({
  player,
  team,
  league,
  onBack,
  onOpenGames,
  onOpenVault,
  onOpenSearch,
}: {
  player: Player;
  team: Team;
  league: League;
  onBack: () => void;
  onOpenGames: () => void;
  onOpenVault: () => void;
  onOpenSearch: () => void;
}) {
  const [seasonIndex, setSeasonIndex] = useState(0);
  const stats = player.seasons[seasonIndex] ?? player.seasons[0];
  const marketValue = new Intl.NumberFormat("pt-BR", {
    currency: "EUR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(player.marketValueEUR);
  const averageRating = stats?.recentRatings.length
    ? stats.recentRatings.reduce((sum, rating) => sum + rating, 0) / stats.recentRatings.length
    : 0;
  const recentOpponents = ["ATM", "VAL", "BAR", "RSO", "BAY", "BVB"];
  const metrics = stats
    ? [
        { icon: Trophy, label: league.sport === "basketball" ? "Pontos" : "Gols", note: "Top 3 club", value: stats.goals },
        { icon: HandshakeIcon, label: "Assistências", note: "0.34/90m", value: stats.assists },
        { icon: Activity, label: "Chutes no gol", note: "+0.12 vs média", value: stats.shotsOnTarget },
        { icon: BoltIcon, label: "Dribles concl.", note: "#1 na liga", value: (stats.shotsOnTarget / Math.max(stats.appearances, 1)).toFixed(1) },
      ]
    : [];
  const percentiles = stats
    ? [
        { label: "Aceleração & Explosão", value: Math.min(98, stats.percentiles.shotsOnTarget + 10), tone: "primary" },
        { label: "Finalização & Gols", value: stats.percentiles.goals, tone: "primary" },
        { label: "Criatividade & Chances Criadas", value: stats.percentiles.assists, tone: "secondary" },
        { label: "Presença & Ritmo", value: stats.percentiles.appearances, tone: "muted" },
      ]
    : [];
  const titleGroups = groupTitles(player.titles);

  return (
    <section className="player-vault-page" aria-label={`${player.name} Player Analytics`}>
      <header className="player-vault-topbar">
        <div>
          <button onClick={onBack} aria-label="Voltar">
            <ArrowLeft size={20} />
          </button>
          <span>Player Analytics</span>
        </div>
        <nav aria-label="Ações do atleta">
          <button aria-label="Compartilhar">
            <Share2 size={19} />
          </button>
          <button aria-label="Favoritar">
            <Star size={19} fill="currentColor" />
          </button>
        </nav>
      </header>

      <section className="player-hero-card">
        <span className="player-number-watermark">#{player.id.length + player.age % 10}</span>
        <div className="player-avatar-card">
          <CircleUserRound size={54} />
          <b>{player.nationality.slice(0, 3).toUpperCase()}</b>
        </div>
        <div className="player-hero-info">
          <span className="active-status"><i />Ativo • Titular</span>
          <h1>{player.name}</h1>
          <p>{team.name} • <b>{player.position}</b></p>
          <div className="player-quick-facts">
            <div>
              <span>Valor mercado</span>
              <b>{marketValue}</b>
            </div>
            <div>
              <span>Idade</span>
              <b>{player.age} anos</b>
            </div>
          </div>
        </div>
      </section>

      <label className="season-filter">
        <CalendarDays size={18} />
        <select value={seasonIndex} onChange={(event) => setSeasonIndex(Number(event.target.value))}>
          {player.seasons.map((season, index) => (
            <option key={`${season.season}-${season.competitionId}`} value={index}>
              {season.season} - Todas as Competições
            </option>
          ))}
        </select>
      </label>

      <section className="player-metrics-section">
        <div className="player-section-header">
          <h2>Métricas Principais (Temporada)</h2>
          <span>Per 90 & Totais</span>
        </div>
        {stats ? (
          <div className="player-metric-grid">
            {metrics.map(({ icon: Icon, label, note, value }) => (
              <article key={label} className="player-metric-card">
                <header>
                  <span>{label}</span>
                  <Icon size={17} />
                </header>
                <strong>{value}</strong>
                <small>{note}</small>
              </article>
            ))}
            <article className="player-metric-card wide">
              <div>
                <span>Velocidade máxima registrada</span>
                <strong>{(32 + stats.shotsOnTarget / 5).toFixed(1)} <small>km/h</small></strong>
              </div>
              <b>Top 1% sprint</b>
            </article>
          </div>
        ) : (
          <div className="empty-state compact-empty">
            <BarChart3 size={25} />
            <h3>Sem métricas disponíveis.</h3>
            <p>Este atleta ainda não possui temporada cadastrada.</p>
          </div>
        )}
      </section>

      {stats && (
        <>
          <section className="player-panel recent-performance-panel">
            <div className="player-panel-header">
              <div>
                <h2>Desempenho Recente</h2>
                <p>Ratings nos últimos confrontos</p>
              </div>
              <strong>{averageRating.toFixed(2)} AVG</strong>
            </div>
            <div className="recent-rating-chart">
              {stats.recentRatings.map((rating, index) => (
                <div key={`${rating}-${index}`}>
                  <span className={rating === Math.max(...stats.recentRatings) ? "peak" : ""}>{rating.toFixed(1)}</span>
                  <b className={rating === Math.max(...stats.recentRatings) ? "peak" : ""} style={{ height: `${rating * 10}%` }} />
                  <small>{recentOpponents[index % recentOpponents.length]}</small>
                </div>
              ))}
            </div>
          </section>

          <section className="player-panel percentile-panel">
            <div className="player-section-header">
              <h2>Percentis vs. Pares Globais</h2>
              <span>Top Tier</span>
            </div>
            {percentiles.map((item) => (
              <div key={item.label} className="player-percentile-row">
                <div>
                  <span>{item.label}</span>
                  <b>{item.value}%</b>
                </div>
                <div className="player-percentile-track">
                  <span className={item.tone} style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
          </section>
        </>
      )}

      <section className="player-panel player-titles-panel">
        <div className="player-panel-header">
          <div>
            <h2><Medal size={17} />Histórico de Títulos no Vault</h2>
          </div>
          <strong>{player.titles.length} troféus</strong>
        </div>
        {titleGroups.length ? (
          <div className="player-title-grid">
            {titleGroups.map((title) => (
              <article key={title.label}>
                <Trophy size={24} />
                <b>{title.count}x</b>
                <span>{title.label}</span>
              </article>
            ))}
          </div>
        ) : (
          <p className="standing-empty">Nenhum título cadastrado.</p>
        )}
      </section>

      <AppBottomNav
        active="profile"
        className="player-vault-bottom"
        onOpenFavorites={onOpenVault}
        onOpenGames={onOpenGames}
        onOpenSearch={onOpenSearch}
        onOpenVault={onOpenVault}
      />
    </section>
  );
}
function groupTitles(titles: string[]) {
  const normalized = titles.map((title) => {
    if (title.toLowerCase().includes("champions")) return "UCL";
    if (title.toLowerCase().includes("liga") || title.toLowerCase().includes("league")) return "Liga";
    if (title.toLowerCase().includes("copa") || title.toLowerCase().includes("cup")) return "Copa";
    return title.replace(/\s+\d{4}.*/, "");
  });
  return Object.entries(
    normalized.reduce<Record<string, number>>((acc, title) => {
      acc[title] = (acc[title] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .slice(0, 3)
    .map(([label, count]) => ({ count, label }));
}
function HandshakeIcon({ size }: { size: number }) {
  return <Heart size={size} />;
}
function BoltIcon({ size }: { size: number }) {
  return <Sparkles size={size} />;
}
function TeamVaultPage({
  team,
  league,
  events,
  players,
  teams,
  getTeam,
  saved,
  onBack,
  onToggleFavorite,
  onOpenGames,
  onOpenVault,
  onOpenSearch,
  onSelectPlayer,
}: {
  team: Team;
  league: League;
  events: SportEvent[];
  players: Player[];
  teams: Team[];
  getTeam: (id: string) => Team;
  saved: boolean;
  onBack: () => void;
  onToggleFavorite: () => void;
  onOpenGames: () => void;
  onOpenVault: () => void;
  onOpenSearch: () => void;
  onSelectPlayer: (player: Player) => void;
}) {
  const upcoming = events
    .filter((event) => event.status === "scheduled" || event.status === "live")
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0];
  const opponent = upcoming
    ? getTeam(upcoming.homeTeamId === team.id ? upcoming.awayTeamId : upcoming.homeTeamId)
    : teams.find((item) => item.leagueId === team.leagueId && item.id !== team.id);
  const wins = 34 + (team.shortName.length % 6);
  const losses = 24 - (team.shortName.length % 4);
  const ranking = Math.max(1, teams.filter((item) => item.leagueId === team.leagueId).findIndex((item) => item.id === team.id) + 1);
  const form = ["V", "V", "D", "V", wins % 2 === 0 ? "V" : "D"];
  const leaderCards = [
    { label: "Gols/Pontos", player: players[0], value: players[0]?.seasons[0]?.goals ? `${players[0].seasons[0].goals}` : "25.2", unit: league.sport === "basketball" ? "PPG" : "Gols" },
    { label: "Assistências", player: players[1] ?? players[0], value: `${players[1]?.seasons[0]?.assists ?? players[0]?.seasons[0]?.assists ?? 7.8}`, unit: "APG" },
    { label: "Presença", player: players[0], value: `${players[0]?.seasons[0]?.appearances ?? 14}`, unit: "Jogos" },
  ];
  const lineup = buildLineup(players, team);

  return (
    <section className="team-vault-page" aria-label={`${team.name} Team Vault`}>
      <header className="team-vault-topbar">
        <button onClick={onBack} aria-label="Voltar">
          <ArrowLeft size={21} />
        </button>
        <div>
          <b>SPORTS VAULT</b>
          <span />
        </div>
        <nav aria-label="Ações do time">
          <button onClick={onToggleFavorite} aria-label={saved ? "Remover dos favoritos" : "Adicionar aos favoritos"}>
            <Star size={20} fill={saved ? "currentColor" : "none"} />
          </button>
          <button aria-label="Menu de opções">
            <MoreVertical size={20} />
          </button>
        </nav>
      </header>

      <div className="team-hero-card" style={{ "--team-color": team.color } as React.CSSProperties}>
        <div className="team-hero-surface" />
        <div className="team-hero-content">
          <div className="team-crest-xl">
            <Shield size={44} fill="currentColor" />
            <small>{team.shortName}</small>
          </div>
          <h1>{team.name}</h1>
          <p>{league.name} • {league.country}</p>
          <div className="team-record-pill">
            <span />
            <b>{wins}-{losses}</b>
            <small>({ranking}º na liga)</small>
          </div>
          <div className="team-form-strip">
            <span>Forma:</span>
            {form.map((result, index) => (
              <b key={`${result}-${index}`} className={result === "V" ? "win" : "loss"}>{result}</b>
            ))}
          </div>
        </div>
      </div>

      <nav className="team-pill-tabs" aria-label="Seções do time">
        {["Visão Geral", "Jogos", "Classificação", "Elenco", "Estatísticas"].map((tab, index) => (
          <button key={tab} className={index === 0 ? "active" : ""}>{tab}</button>
        ))}
      </nav>

      <section className="team-module next-match-module">
        <header>
          <div>
            <Trophy size={16} />
            <span>Próximo duelo • {league.season}</span>
          </div>
          <b>{upcoming ? formatShortKickoff(upcoming.startsAt) : "A definir"}</b>
        </header>
        <div className="team-faceoff">
          <TeamFaceoffBadge team={team} record={`${wins}-${losses}`} />
          <div className="faceoff-center">
            <strong>VS</strong>
            <span>{upcoming?.status === "live" ? "AO VIVO" : "EM BREVE"}</span>
          </div>
          <TeamFaceoffBadge team={opponent ?? team} record={`${Math.max(wins - 4, 1)}-${losses + 4}`} muted />
        </div>
        <footer>
          <span><MapPin size={15} />{upcoming?.venue ?? `${team.city} Arena`}</span>
          <b>Série: {team.shortName} 1-1 {opponent?.shortName ?? "OPP"}</b>
        </footer>
      </section>

      <section className="team-module efficiency-module">
        <header>
          <h2><Activity size={17} />Eficiência Coletiva</h2>
          <span>Ranking geral</span>
        </header>
        <EfficiencyBar label={league.sport === "football" ? "Eficiência ofensiva" : "Offensive Rating"} value="116.8" rank="#8 na liga" percent={82} color="primary" />
        <EfficiencyBar label={league.sport === "football" ? "Solidez defensiva" : "Defensive Rating"} value="112.4" rank="#10 na liga" percent={79} color="secondary" />
      </section>

      <section className="season-leaders-section">
        <div className="team-section-title">
          <h2><Medal size={17} />Líderes da Temporada</h2>
          <span>Médias / jogo</span>
        </div>
        <div className="leader-grid">
          {leaderCards.map((card, index) => (
            <article key={`${card.label}-${index}`} className="leader-card">
              <span>{card.label}</span>
              <div><CircleUserRound size={27} /></div>
              <b>{shortPlayerName(card.player?.name ?? team.name)}</b>
              <small>{card.player?.position ?? "Atleta"}</small>
              <strong>{card.value}</strong>
              <em>{card.unit}</em>
            </article>
          ))}
        </div>
      </section>

      <section className="team-module lineup-module">
        <header>
          <h2><UsersRound size={17} />Provável Titular</h2>
          <span>Confirmado</span>
        </header>
        <div className="lineup-list">
          {lineup.map((player, index) => (
            <button key={`${player.name}-${index}`} onClick={() => player.source && onSelectPlayer(player.source)}>
              <span>#{player.number}</span>
              <div>
                <b>{player.name}</b>
                <small>{player.position} • {player.age} anos</small>
              </div>
              <strong>{player.stat}</strong>
            </button>
          ))}
        </div>
      </section>

      <AppBottomNav
        active="vault"
        className="team-vault-bottom"
        onOpenFavorites={onToggleFavorite}
        onOpenGames={onOpenGames}
        onOpenSearch={onOpenSearch}
        onOpenVault={onOpenVault}
      />
    </section>
  );
}
function TeamFaceoffBadge({ team, record, muted }: { team: Team; record: string; muted?: boolean }) {
  return (
    <div className={muted ? "team-faceoff-badge muted" : "team-faceoff-badge"}>
      <span style={{ backgroundColor: team.color }}>{team.shortName.slice(0, 3)}</span>
      <b>{team.shortName}</b>
      <small>{record}</small>
    </div>
  );
}
function EfficiencyBar({ label, value, rank, percent, color }: { label: string; value: string; rank: string; percent: number; color: "primary" | "secondary" }) {
  return (
    <div className="efficiency-row">
      <div>
        <span className={color} />
        <b>{label}</b>
        <strong>{value}</strong>
        <small>{rank}</small>
      </div>
      <div className="efficiency-track">
        <span className={color} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
function buildLineup(players: Player[], team: Team) {
  const fallbacks = [
    { name: `${team.shortName} Armador`, position: "Armador", age: 28, stat: "18.0 PPG", number: 1 },
    { name: `${team.shortName} Ala`, position: "Ala", age: 26, stat: "15.9 PPG", number: 15 },
    { name: `${team.shortName} Pivô`, position: "Pivô", age: 29, stat: "13.6 PPG", number: 28 },
    { name: `${team.shortName} Capitão`, position: "Capitão", age: 31, stat: "25.2 PPG", number: 23 },
    { name: `${team.shortName} Sexto Homem`, position: "Reserva", age: 24, stat: "12.4 PPG", number: 3 },
  ];

  return fallbacks.map((fallback, index) => {
    const source = players[index] ?? players[index % Math.max(players.length, 1)];
    return {
      age: source?.age ?? fallback.age,
      name: source?.name ?? fallback.name,
      number: fallback.number,
      position: source?.position ?? fallback.position,
      source,
      stat: source?.seasons[0] ? `${source.seasons[0].goals || source.seasons[0].assists || source.seasons[0].appearances} destaque` : fallback.stat,
    };
  });
}
function formatShortKickoff(startsAt: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(startsAt));
}
function shortPlayerName(name: string) {
  const parts = name.split(" ");
  return parts.length > 1 ? `${parts[0][0]}. ${parts.at(-1)}` : name;
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
function EventSummaryStats({
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
function EventSummaryLeaders({ leaders }: { leaders: EventSummaryLeader[] }) {
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
function DetailDialog({ team, event, players, teams, getTeam, getLeague, onSelectPlayer, onCompare, onClose }: { team: Team | null; event: SportEvent | null; players: Player[]; teams: Team[]; getTeam: (id: string) => Team; getLeague: (id: string) => League; onSelectPlayer: (player: Player) => void; onCompare: (teamAId: string, teamBId: string) => void; onClose: () => void }) {
  const selectedTeam = team ?? (event ? getTeam(event.homeTeamId) : null);
  const competition = selectedTeam ? getLeague(selectedTeam.leagueId) : event ? getLeague(event.leagueId) : null;
  const home = event ? getTeam(event.homeTeamId) : null;
  const away = event ? getTeam(event.awayTeamId) : null;
  const roster = team ? players.filter((player) => player.teamId === team.id) : [];
  const rivals = team ? teams.filter((item) => item.leagueId === team.leagueId && item.id !== team.id) : [];
  const [rivalId, setRivalId] = useState(rivals[0]?.id ?? "");
  const [eventSummary, setEventSummary] = useState<SportEventSummary | null>(null);
  const [isLoadingEventSummary, setIsLoadingEventSummary] = useState(false);
  const [eventSummaryError, setEventSummaryError] = useState<string | null>(null);

  useEffect(() => {
    if (!event) {
      setEventSummary(null);
      setEventSummaryError(null);
      setIsLoadingEventSummary(false);
      return;
    }

    let isActive = true;

    setIsLoadingEventSummary(true);
    setEventSummaryError(null);

    sportsService
      .getEventSummary(event)
      .then((summary) => {
        if (!isActive) return;
        setEventSummary(summary);
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
  }, [event]);

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
            <p className="detail-venue"><CalendarDays size={16} />{event.venue}</p>
            <section className="event-summary-panel" aria-label="Resumo da partida">
              <div className="event-summary-header">
                <h3 className="player-section-title">Resumo da partida</h3>
                {eventSummary?.shortStatus && <span>{eventSummary.shortStatus}</span>}
              </div>
              {eventSummary?.note && <p className="event-summary-note">{eventSummary.note}</p>}
              {isLoadingEventSummary ? (
                <p className="detail-copy">Carregando estatísticas...</p>
              ) : eventSummaryError ? (
                <p className="detail-copy" role="alert">{eventSummaryError}</p>
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
                </>
              ) : (
                <p className="detail-copy">Resumo estatístico indisponível para esta partida.</p>
              )}
            </section>
          </>
        )}
      </section>
    </div>
  );
}
function PlayerDialog({ player, team, getLeague, onClose }: { player: Player; team: Team; getLeague: (id: string) => League; onClose: () => void }) {
  const [seasonIndex, setSeasonIndex] = useState(0);
  const stats = player.seasons[seasonIndex] ?? player.seasons[0];
  const competition = stats ? getLeague(stats.competitionId) : null;
  const marketValue = player.marketValueEUR > 0
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(player.marketValueEUR)
    : null;
  const metrics = stats
    ? [
        { label: "Jogos", value: stats.appearances },
        { label: "Gols", value: stats.goals },
        { label: "Assistências", value: stats.assists },
        { label: "Chutes no gol", value: stats.shotsOnTarget },
        { label: "Cartões amarelos", value: stats.yellowCards },
      ]
    : [];
  const percentiles = stats
    ? [
        { label: "Gols", value: stats.percentiles.goals },
        { label: "Assistências", value: stats.percentiles.assists },
        { label: "Chutes no gol", value: stats.percentiles.shotsOnTarget },
        { label: "Presença", value: stats.percentiles.appearances },
      ]
    : [];
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="detail-dialog player-dialog" role="dialog" aria-modal="true" aria-labelledby="player-title" onMouseDown={(mouseEvent) => mouseEvent.stopPropagation()}>
        <button className="dialog-close" onClick={onClose} aria-label="Fechar ficha do atleta">×</button>
        <span className="crest detail-crest" style={{ backgroundColor: team.color }}>{team.shortName.slice(0, 2)}</span>
        <p className="eyebrow">{player.position} · {team.name}</p>
        <h2 id="player-title">{player.name}</h2>
        <p className="detail-copy">{player.age} anos · {player.nationality}{marketValue ? ` · Valor de mercado ${marketValue}` : ""}</p>
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
  const date = formatEventCardDate(event.startsAt);
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
            {event.status === "finished" ? `Encerrado · ${date}` : date}
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
