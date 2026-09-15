import { useState } from "react";
import { ChevronDown, Heart, Search, X } from "lucide-react";
import type { League, SportCode, Team } from "../types/sports";
import { groupTeams } from "../helpers/teamGroups";
import { TeamCrest } from "./TeamCrest";

interface TeamSearchProps {
  teams: Team[];
  leagues: League[];
  savedTeamIds: string[];
  onToggle: (id: string) => void;
  onSelect: (team: Team) => void;
}

const sports: { id: SportCode; name: string; color: string }[] = [
  { id: "football", name: "Futebol", color: "#7bfd8b" },
  { id: "basketball", name: "Basquete", color: "#ffbb78" },
  { id: "american_football", name: "Futebol americano", color: "#c5d0ff" },
];

function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

export function TeamSearch({ teams, leagues, savedTeamIds, onToggle, onSelect }: TeamSearchProps) {
  const [query, setQuery] = useState("");
  const [sportId, setSportId] = useState<SportCode | null>(null);
  const [competitionId, setCompetitionId] = useState<string | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const normalizedQuery = normalizeSearch(query);
  const uniqueTeams = groupTeams(teams, leagues);
  const availableSports = sports.filter((sport) => uniqueTeams.some((group) => group.sport === sport.id));
  const sportTeams = uniqueTeams.filter((group) => !sportId || group.sport === sportId);
  const competitions = leagues.filter((league) => sportTeams.some((group) => group.leagues.some((item) => item.id === league.id)));
  const results = availableSports.filter((sport) => !sportId || sport.id === sportId).map((sport) => ({
    sport,
    teams: sportTeams.filter((group) => group.sport === sport.id
      && (!competitionId || group.leagues.some((league) => league.id === competitionId))
      && normalizeSearch(`${sport.name} ${group.variants.map((team) => `${team.name} ${team.shortName} ${team.city}`).join(" ")} ${group.leagues.map((league) => `${league.name} ${league.country}`).join(" ")}`).includes(normalizedQuery)),
  })).filter((group) => group.teams.length > 0);
  const total = results.reduce((count, group) => count + group.teams.length, 0);

  function resetFilters() {
    setQuery("");
    setSportId(null);
    setCompetitionId(null);
    setCollapsedIds(new Set());
  }

  function toggleGroup(id: string) {
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section className="team-search" aria-label="Explorar times por esporte">
      <p className="search-description">Times e seleções por esporte. Todas as competições em um só lugar.</p>
      <div className="search-box">
        <Search size={20} aria-hidden="true" />
        <input aria-label="Buscar time, cidade, esporte ou competição" value={query} placeholder="Time, seleção ou competição" onChange={(event) => { setQuery(event.target.value); setCollapsedIds(new Set()); }} />
        {query && <button className="search-clear" aria-label="Limpar busca" onClick={() => setQuery("")}><X size={18} /></button>}
      </div>
      <div className="competition-filters sport-search-filters" role="group" aria-label="Filtrar por esporte">
        <button aria-pressed={sportId === null} onClick={() => { setSportId(null); setCompetitionId(null); setCollapsedIds(new Set()); }}>Todos <span>{uniqueTeams.length}</span></button>
        {availableSports.map((sport) => <button key={sport.id} aria-pressed={sportId === sport.id} onClick={() => { setSportId(sport.id); setCompetitionId(null); setCollapsedIds(new Set()); }}>{sport.name}<span>{uniqueTeams.filter((group) => group.sport === sport.id).length}</span></button>)}
      </div>
      <div className="search-competition-section">
        <p className="search-filter-label">Competição</p>
        <div className="competition-filters search-competition-strip" role="group" aria-label="Filtrar por competição">
          <button aria-pressed={competitionId === null} onClick={() => { setCompetitionId(null); setCollapsedIds(new Set()); }}>Todas</button>
          {competitions.map((league) => <button key={league.id} aria-pressed={competitionId === league.id} onClick={() => { setCompetitionId(league.id); setCollapsedIds(new Set()); }}>{league.name}</button>)}
        </div>
      </div>
      <p className="search-result-count" role="status">{total} {total === 1 ? "time ou seleção" : "times e seleções"} · {results.length} {results.length === 1 ? "esporte" : "esportes"}</p>
      {results.length ? <div className="competition-groups">
        {results.map(({ sport, teams: sportResults }) => {
          const expanded = !collapsedIds.has(sport.id);
          return (
            <section className="competition-group" key={sport.id} aria-labelledby={`sport-heading-${sport.id}`}>
              <h2 id={`sport-heading-${sport.id}`}>
                <button className="competition-heading" aria-expanded={expanded} aria-controls={`sport-teams-${sport.id}`} onClick={() => toggleGroup(sport.id)}>
                  <span className="competition-marker" style={{ backgroundColor: sport.color }} />
                  <span className="competition-name"><strong>{sport.name}</strong><small>{sportResults.length} {sportResults.length === 1 ? "time ou seleção" : "times e seleções"}</small></span>
                  <ChevronDown size={20} className={expanded ? "expanded" : ""} aria-hidden="true" />
                </button>
              </h2>
              <ul id={`sport-teams-${sport.id}`} hidden={!expanded} className="competition-team-list">
                {sportResults.map((group) => {
                  const team = group.variants.find((variant) => variant.leagueId === competitionId) ?? group.team;
                  const saved = group.variants.some((variant) => savedTeamIds.includes(variant.id));
                  return <li key={group.id} className="search-team-row">
                    <button className="search-team-detail" onClick={() => onSelect(team)}><TeamCrest team={group.team} /><span><strong>{team.name}</strong><small>{team.city}</small><span className="search-team-competitions">{group.leagues.map((league) => <span key={league.id}>{league.name}</span>)}</span></span></button>
                    <button className={saved ? "heart saved" : "heart"} aria-label={saved ? `Remover ${team.name} do Vault` : `Salvar ${team.name} no Vault`} aria-pressed={saved} onClick={() => onToggle(team.id)}><Heart size={20} fill={saved ? "currentColor" : "none"} /></button>
                  </li>;
                })}
              </ul>
            </section>
          );
        })}
      </div> : <div className="empty-state"><Search size={25} /><h3>{teams.length ? "Nada encontrado." : "Nenhum time disponível."}</h3><p>{teams.length ? "Tente outro nome ou remova os filtros." : "Os times aparecerão quando os dados estiverem disponíveis."}</p>{(query || sportId || competitionId) && <button className="primary-button" onClick={resetFilters}>Limpar filtros</button>}</div>}
    </section>
  );
}
