import { useState } from "react";
import { ChevronDown, Heart, Search, X } from "lucide-react";
import type { League, Team } from "../types/sports";
import { TeamCrest } from "./TeamCrest";

interface TeamSearchProps {
  teams: Team[];
  leagues: League[];
  savedTeamIds: string[];
  onToggle: (id: string) => void;
  onSelect: (team: Team) => void;
}

function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

export function TeamSearch({ teams, leagues, savedTeamIds, onToggle, onSelect }: TeamSearchProps) {
  const [query, setQuery] = useState("");
  const [competitionId, setCompetitionId] = useState<string | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const normalizedQuery = normalizeSearch(query);
  const groups = leagues.map((league) => ({
    league,
    teams: teams.filter((team) => team.leagueId === league.id),
  })).filter((group) => group.teams.length > 0);
  const results = groups.filter(({ league }) => !competitionId || league.id === competitionId)
    .map(({ league, teams: groupTeams }) => ({
      league,
      teams: groupTeams.filter((team) => normalizeSearch(`${team.name} ${team.shortName} ${team.city} ${league.name} ${league.country}`).includes(normalizedQuery))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    })).filter((group) => group.teams.length > 0);
  const total = results.reduce((count, group) => count + group.teams.length, 0);

  function toggleGroup(id: string) {
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section className="team-search" aria-label="Explorar times por competição">
      <p className="search-description">Encontre seu time e salve no Meu Vault.</p>
      <div className="search-box">
        <Search size={20} aria-hidden="true" />
        <input aria-label="Buscar time, cidade ou competição" value={query} placeholder="Time, cidade ou competição" onChange={(event) => { setQuery(event.target.value); setCollapsedIds(new Set()); }} />
        {query && <button className="search-clear" aria-label="Limpar busca" onClick={() => setQuery("")}><X size={18} /></button>}
      </div>
      <div className="competition-filters" role="group" aria-label="Filtrar por competição">
        <button aria-pressed={competitionId === null} onClick={() => { setCompetitionId(null); setCollapsedIds(new Set()); }}>Todas <span>{teams.length}</span></button>
        {groups.map(({ league, teams: groupTeams }) => (
          <button key={league.id} aria-pressed={competitionId === league.id} onClick={() => { setCompetitionId(league.id); setCollapsedIds(new Set()); }}>{league.name} <span>{groupTeams.length}</span></button>
        ))}
      </div>
      <p className="search-result-count" role="status">{total} {total === 1 ? "time" : "times"} · {results.length} {results.length === 1 ? "competição" : "competições"}</p>
      {results.length ? <div className="competition-groups">
        {results.map(({ league, teams: groupTeams }) => {
          const expanded = !collapsedIds.has(league.id);
          return (
            <section className="competition-group" key={league.id} aria-labelledby={`competition-heading-${league.id}`}>
              <h2 id={`competition-heading-${league.id}`}>
                <button className="competition-heading" aria-expanded={expanded} aria-controls={`competition-teams-${league.id}`} onClick={() => toggleGroup(league.id)}>
                  <span className="competition-marker" style={{ backgroundColor: league.color }} />
                  <span className="competition-name"><strong>{league.name}</strong><small>{league.country} · {groupTeams.length} {groupTeams.length === 1 ? "time" : "times"}</small></span>
                  <ChevronDown size={20} className={expanded ? "expanded" : ""} aria-hidden="true" />
                </button>
              </h2>
              <ul id={`competition-teams-${league.id}`} hidden={!expanded} className="competition-team-list">
                {groupTeams.map((team) => {
                  const saved = savedTeamIds.includes(team.id);
                  return <li key={team.id} className="search-team-row">
                    <button className="search-team-detail" onClick={() => onSelect(team)}><TeamCrest team={team} /><span><strong>{team.name}</strong><small>{team.city}</small></span></button>
                    <button className={saved ? "heart saved" : "heart"} aria-label={saved ? `Remover ${team.name} do Vault` : `Salvar ${team.name} no Vault`} aria-pressed={saved} onClick={() => onToggle(team.id)}><Heart size={20} fill={saved ? "currentColor" : "none"} /></button>
                  </li>;
                })}
              </ul>
            </section>
          );
        })}
      </div> : <div className="empty-state"><Search size={25} /><h3>{teams.length ? "Nada encontrado." : "Nenhum time disponível."}</h3><p>{teams.length ? "Tente outro nome ou remova os filtros." : "Os times aparecerão quando os dados estiverem disponíveis."}</p>{(query || competitionId) && <button className="primary-button" onClick={() => { setQuery(""); setCompetitionId(null); setCollapsedIds(new Set()); }}>Limpar filtros</button>}</div>}
    </section>
  );
}
