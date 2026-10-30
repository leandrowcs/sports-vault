import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, Plus, Search, X } from "lucide-react";
import type { League, Team } from "../types/sports";
import { groupTeams } from "../helpers/teamGroups";
import { getFocusGroup } from "../helpers/focusGroups";
import { TeamCrest } from "./TeamCrest";

const competitions = [
  { id: "nba", label: "NBA" },
  { id: "nfl", label: "NFL" },
  { id: "brasileirao-a", label: "Série A" },
  { id: "brasileirao-b", label: "Série B" },
  { id: "copa-do-brasil", label: "Copa do Brasil" },
];

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
const initialOf = (name: string) => {
  const letter = normalize(name).charAt(0).toLocaleUpperCase("pt-BR");
  return /[A-Z]/.test(letter) ? letter : "#";
};

export function AddTeamDialog({ teams, leagues, savedTeamIds, onToggle, onClose }: {
  teams: Team[];
  leagues: League[];
  savedTeamIds: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
}) {
  const baseId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const tabButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const tabs = competitions.filter((item) => leagues.some((league) => league.id === item.id) && teams.some((team) => team.leagueId === item.id));
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const selectedIndex = Math.max(0, tabs.findIndex((item) => item.id === activeId));
  const activeTab = tabs[selectedIndex];

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const unique = useMemo(() => groupTeams(teams, leagues), [teams, leagues]);
  const normalizedQuery = normalize(query);
  const sections = (() => {
    if (!activeTab) return [];
    const rows = unique
      .filter((group) => group.leagues.some((league) => league.id === activeTab.id))
      .map((group) => ({ group, team: group.variants.find((variant) => variant.leagueId === activeTab.id) ?? group.team }))
      .filter(({ team }) => !normalizedQuery || normalize(`${team.name} ${team.shortName} ${team.city}`).includes(normalizedQuery))
      .sort((a, b) => a.team.name.localeCompare(b.team.name, "pt-BR"));
    const byInitial = new Map<string, typeof rows>();
    for (const row of rows) {
      const initial = initialOf(row.team.name);
      byInitial.set(initial, [...(byInitial.get(initial) ?? []), row]);
    }
    return [...byInitial];
  })();
  const total = sections.reduce((count, [, rows]) => count + rows.length, 0);

  function selectTab(index: number) {
    setActiveId(tabs[index].id);
    tabButtons.current[index]?.focus();
  }

  return (
    <div className="dialog-backdrop add-team-backdrop" onClick={onClose}>
      <section
        ref={dialogRef}
        className="detail-dialog add-team-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${baseId}-title`}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            onClose();
          }
        }}
      >
        <button className="dialog-close" aria-label="Fechar" onClick={onClose}><X size={16} /></button>
        <h2 id={`${baseId}-title`} className="add-team-title">Adicionar time</h2>
        {tabs.length === 0 ? (
          <div className="empty-state"><Search size={25} /><h3>Nenhum time disponível.</h3><p>Os times aparecerão quando os dados estiverem disponíveis.</p></div>
        ) : (
          <>
            <div className="search-box">
              <Search size={20} aria-hidden="true" />
              <input aria-label="Buscar time ou cidade" type="search" value={query} placeholder="Buscar time ou cidade" onChange={(event) => setQuery(event.target.value)} />
              {query && <button className="search-clear" aria-label="Limpar busca" onClick={() => setQuery("")}><X size={18} /></button>}
            </div>
            <nav className="competition-tabs add-team-tabs" role="tablist" aria-label="Competição">
              {tabs.map((item, index) => (
                <button
                  key={item.id}
                  ref={(element) => { tabButtons.current[index] = element; }}
                  id={`${baseId}-tab-${item.id}`}
                  type="button"
                  role="tab"
                  data-sport={getFocusGroup(leagues.find((league) => league.id === item.id)!)}
                  aria-controls={`${baseId}-panel`}
                  aria-selected={selectedIndex === index}
                  tabIndex={selectedIndex === index ? 0 : -1}
                  onClick={() => setActiveId(item.id)}
                  onKeyDown={(event) => {
                    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                    event.preventDefault();
                    selectTab(event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            <div className="add-team-list" id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-tab-${activeTab.id}`}>
              <p className="search-result-count" role="status">{total} {total === 1 ? "time" : "times"} · {activeTab.label}</p>
              {sections.length ? sections.map(([initial, rows]) => (
                <section key={initial} className="add-team-group" aria-label={`Times com ${initial}`}>
                  <h3>{initial}</h3>
                  <ul>
                    {rows.map(({ group, team }) => {
                      const saved = group.variants.some((variant) => savedTeamIds.includes(variant.id));
                      return (
                        <li key={group.id}>
                          <button
                            type="button"
                            className={saved ? "add-team-row saved" : "add-team-row"}
                            data-football={team.leagueId !== "nba" && team.leagueId !== "nfl" ? "" : undefined}
                            aria-pressed={saved}
                            aria-label={saved ? `Remover ${team.name} dos favoritos` : `Adicionar ${team.name} aos favoritos`}
                            onClick={() => onToggle(team.id)}
                          >
                            <TeamCrest team={team} />
                            <span><strong>{team.name}</strong><small>{team.city}</small></span>
                            {saved ? <Check size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )) : <div className="empty-state"><Search size={25} /><h3>Nada encontrado.</h3><p>Tente outro nome ou outra aba.</p>{query && <button className="primary-button" onClick={() => setQuery("")}>Limpar busca</button>}</div>}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
