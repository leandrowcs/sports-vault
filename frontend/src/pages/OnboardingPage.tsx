import { useState } from "react";
import { ArrowRight, Check, Plus, Search, SlidersHorizontal } from "lucide-react";
import { SportIcon } from "../components/SportIcon";
import { getSportGroup } from "../helpers/focusGroups";
import type { League, Player, SportCode, Team } from "../types/sports";
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
export function OnboardingScreen({
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
                sport={option.id}
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
function SportChoiceCard({ sport, active, label, description, onClick }: { sport: SportCode; active: boolean; label: string; description: string; onClick: () => void }) {
  return (
    <button type="button" data-sport={getSportGroup(sport)} aria-pressed={active} className={active ? "sport-choice-card active" : "sport-choice-card"} onClick={onClick}>
      <div>
        <span><SportIcon sport={getSportGroup(sport)} size={24} /></span>
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
