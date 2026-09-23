import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Compass, LogIn, LogOut } from "lucide-react";
import { NavigationIcon } from "./components/SportIcon";
import { FOCUS_GROUPS } from "./helpers/focusGroups";
import "./App.css";
import { LoginScreen } from "./components/LoginScreen";
import { TeamSearch } from "./pages/SearchPage";
import { groupTeams, toggleTeamGroup } from "./helpers/teamGroups";
import { useCloudAuth } from "./hooks/useCloudAuth";
import { sportsService } from "./services/sportsService";
import { readLocalVault, subscribeToCloudVault, writeVault } from "./services/vaultStore";
import type { League, Player, SportEvent, Team, VaultState, View } from "./types/sports";
import { VaultFeedHome } from "./pages/HomePage";
import { OnboardingScreen } from "./pages/OnboardingPage";
import { TeamVaultPage } from "./pages/TeamPage";
import { PlayerVaultPage } from "./pages/PlayerPage";
import { DetailDialog } from "./components/DetailDialog";
import { PlayerDialog } from "./components/PlayerDialog";
import { HeadToHeadDialog } from "./components/HeadToHeadDialog";
import { VaultPage } from "./pages/VaultPage";
import { CompetitionsPage } from "./pages/CompetitionsPage";
import { AppBottomNav } from "./components/AppBottomNav";
import { InstallAppPrompt } from "./components/InstallAppPrompt";
const NbaPage = lazy(() => import('./pages/NbaPage').then((module) => ({ default: module.NbaPage })));
const NflPage = lazy(() => import('./pages/NflPage').then((module) => ({ default: module.NflPage })));
const NflTeamPage = lazy(() => import('./pages/NflTeamPage').then((module) => ({ default: module.NflTeamPage })));
const NflGameDialog = lazy(() => import('./components/NflGameDialog').then((module) => ({ default: module.NflGameDialog })));
const NbaTeamPage = lazy(() => import('./pages/NbaTeamPage').then((module) => ({ default: module.NbaTeamPage })));
const NbaGameDialog = lazy(() => import('./components/NbaGameDialog').then((module) => ({ default: module.NbaGameDialog })));
interface SportsData {
  leagues: League[];
  teams: Team[];
  events: SportEvent[];
  players: Player[];
}
const navigation: { id: View; label: string }[] = [
  { id: "home", label: "Início" },
  ...FOCUS_GROUPS,
  { id: "favorites", label: "Favoritos" },
];
function App() {
  const pageHeader = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>("home");
  const [showSearch, setShowSearch] = useState(false);
  const [data, setData] = useState<SportsData | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [vault, setVault] = useState<VaultState>(readLocalVault);
  const [teamPage, setTeamPage] = useState<Team | null>(null);
  const [playerPage, setPlayerPage] = useState<Player | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<SportEvent | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [headToHead, setHeadToHead] = useState<{ teamAId: string; teamBId: string } | null>(null);
  const [vaultError, setVaultError] = useState<string | null>(null);
  const stickyNbaHeader = (view === 'nba' || view === 'nfl') && !teamPage && !playerPage;
  useLayoutEffect(() => {
    const header = pageHeader.current;
    if (!header || !stickyNbaHeader) return;
    const updateHeight = () => header.parentElement?.style.setProperty('--nba-header-height', `${header.getBoundingClientRect().height}px`);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(header);
    return () => {
      observer.disconnect();
      header.parentElement?.style.removeProperty('--nba-header-height');
    };
  }, [stickyNbaHeader, data, vault.onboarded]);
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
        if (selectedEvent) { setSelectedEvent(null); return; }
        if (headToHead) { setHeadToHead(null); return; }
        if (selectedPlayer) { setSelectedPlayer(null); return; }
        if (selectedTeam) { setSelectedTeam(null); return; }
        if (playerPage) { setPlayerPage(null); return; }
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
  }, [selectedEvent, headToHead, selectedPlayer, selectedTeam, playerPage]);
  function navigateTo(nextView: View) {
    setTeamPage(null);
    setPlayerPage(null);
    setShowSearch(false);
    setView(nextView);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function toggleTeam(teamId: string) {
    const variants = data ? groupTeams(data.teams, data.leagues).find((group) => group.variants.some((team) => team.id === teamId))?.variants.map((team) => team.id) : undefined;
    setVault((current) => {
      const teamIds = toggleTeamGroup(current.teamIds, variants ?? [teamId]);
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
      <main className="loading">
        <section className="login-card">
          <img src="/icon.svg" alt="" width="64" height="64" />
          <h1>Sports Vault</h1>
          <p role="alert">
            {dataError}
          </p>
          <button className="primary-button" onClick={() => window.location.reload()}>Tentar novamente</button>
        </section>
      </main>
    );
  }
  if (!data) return <main className="loading" role="status">Carregando seu Vault...</main>;
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
  const greeting = user?.displayName?.split(" ")[0] ?? "Leandro";
  const sportHeading = ['nba', 'nfl', 'futebol', 'selecao'].includes(view) && !showSearch;
  const initials = (user?.displayName ?? "LD")
    .split(" ")
    .map((name) => name[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => navigateTo("home")}>
          <span className="brand-mark">
            <img src="/icon.svg" alt="" width="40" height="40" />
          </span>
          <span>
            Sports
            <br />
            <b>Vault</b>
          </span>
        </button>
        <nav aria-label="Navegação principal">
          {navigation.map(({ id, label }) => (
            <button
              key={id}
              data-sport={id}
              aria-current={view === id ? "page" : undefined}
              className={view === id ? "nav-item active" : "nav-item"}
              onClick={() => navigateTo(id)}
            >
              <NavigationIcon view={id} />
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <Compass size={18} />
          <span>
            {import.meta.env.VITE_USE_MOCK_SPORTS === "true" ? "Dados de demonstração" : "Dados esportivos ESPN"}
            <br />
            Seu painel esportivo
          </span>
        </div>
      </aside>
      <main className="content">
        <div ref={pageHeader} className={stickyNbaHeader ? 'app-page-header nba-sticky-header' : 'app-page-header'}>
        {!teamPage && !playerPage && <header className={sportHeading ? 'topbar sport-topbar' : 'topbar'}>
          <button className="brand header-brand" aria-label="Sports Vault — início" onClick={() => navigateTo("home")}>
            <img src="/icon.svg" alt="" width="42" height="42" />
            <span>Sports <strong>Vault</strong></span>
          </button>
          {sportHeading && <h1 className="page-heading view-heading" data-sport={view}>
            <NavigationIcon view={view} size={28} />
            {navigation.find((item) => item.id === view)?.label}
          </h1>}
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
            <span className="demo-account">Modo local</span>
          )}
        </header>}
        {!teamPage && !playerPage && !sportHeading && <h1 className="page-heading view-heading" data-sport={view}>
          {view !== "home" && !showSearch && <NavigationIcon view={view} size={28} />}
          {showSearch ? "Buscar times" : view === "home" ? `Olá, ${greeting}.` : navigation.find((item) => item.id === view)?.label}
        </h1>}
        </div>
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
          />
        ) : teamPage?.leagueId === 'nba' ? (
          <Suspense fallback={<p role="status">Carregando equipe…</p>}>
            <NbaTeamPage key={teamPage.id} team={teamPage} saved={vault.teamIds.includes(teamPage.id)} onBack={() => setTeamPage(null)} onToggleFavorite={() => toggleTeam(teamPage.id)} onEvent={setSelectedEvent} />
          </Suspense>
        ) : teamPage?.leagueId === 'nfl' ? (
          <Suspense fallback={<p role="status">Carregando equipe…</p>}>
            <NflTeamPage key={teamPage.id} team={teamPage} saved={vault.teamIds.includes(teamPage.id)} onBack={() => setTeamPage(null)} onToggleFavorite={() => toggleTeam(teamPage.id)} onEvent={setSelectedEvent} />
          </Suspense>
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
            onSelectPlayer={setPlayerPage}
          />
        ) : view === "home" ? (
          <VaultFeedHome
            onViewNba={() => navigateTo('nba')}
            onViewNfl={() => navigateTo('nfl')}
            events={data.events}
            leagues={data.leagues}
            getTeam={team}
            getLeague={league}
            onSelectEvent={setSelectedEvent}
          />
        ) : view === 'nba' ? (
          <Suspense fallback={<p role="status">Carregando NBA…</p>}><NbaPage onTeam={setTeamPage} onEvent={setSelectedEvent} /></Suspense>
        ) : view === 'nfl' ? (
          <Suspense fallback={<p role="status">Carregando NFL…</p>}><NflPage onTeam={setTeamPage} onEvent={setSelectedEvent} /></Suspense>
        ) : view === "favorites" ? (
          showSearch ? (
            <TeamSearch teams={data.teams} leagues={data.leagues} savedTeamIds={vault.teamIds} onToggle={toggleTeam} onSelect={(selected) => { setShowSearch(false); setTeamPage(selected); }} />
          ) : (
            <VaultPage favorites={favorites} leagues={data.leagues} onToggle={toggleTeam} onSelect={setTeamPage} onSearch={() => setShowSearch(true)} />
          )
        ) : (
          <CompetitionsPage focusGroup={view} events={data.events} leagues={data.leagues} teams={data.teams} getTeam={team} getLeague={league} onSelectEvent={setSelectedEvent} />
        )}
      </main>
      <AppBottomNav active={view} className="mobile-nav" onNavigate={navigateTo} />
      {selectedEvent?.leagueId === 'nba' ? (
        <Suspense fallback={<p role="status">Carregando partida…</p>}><NbaGameDialog key={selectedEvent.id} event={selectedEvent} onClose={() => setSelectedEvent(null)} onTeam={(selected) => { setSelectedEvent(null); setTeamPage(selected); }} /></Suspense>
      ) : selectedEvent?.leagueId === 'nfl' ? (
        <Suspense fallback={<p role="status">Carregando partida…</p>}><NflGameDialog key={selectedEvent.id} event={selectedEvent} onClose={() => setSelectedEvent(null)} onTeam={(selected) => { setSelectedEvent(null); setTeamPage(selected); }} /></Suspense>
      ) : (selectedTeam || selectedEvent) && (
        <DetailDialog
          key={selectedTeam?.id ?? selectedEvent?.id ?? "detail-dialog"}
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
export default App;
