import { useRef, useState } from 'react';
import { Heart, Plus } from 'lucide-react';
import type { League, SportCode, Team } from '../types/sports';
import { groupTeams } from '../helpers/teamGroups';
import { sportNames } from '../helpers/sportStatistics';
import { SportIcon } from "../components/SportIcon";
import { getSportGroup } from "../helpers/focusGroups";
import { TeamCard } from '../components/TeamCard';
import { AddTeamDialog } from '../components/AddTeamDialog';
export function VaultPage({ favorites, teams, leagues, savedTeamIds, onToggle, onSelect }: { favorites: Team[]; teams: Team[]; leagues: League[]; savedTeamIds: string[]; onToggle: (id: string) => void; onSelect: (team: Team) => void }) {
  const groups = groupTeams(favorites, leagues);
  const availableSports = [...new Set(groups.map((group) => group.sport))];
  const [sport, setSport] = useState<SportCode | 'all'>('all');
  const [adding, setAdding] = useState(false);
  const tabButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedSport = sport === 'all' || availableSports.includes(sport) ? sport : 'all';
  const selectedTabIndex = selectedSport === 'all' ? 0 : availableSports.indexOf(selectedSport) + 1;
  const tabs: { code: SportCode | 'all'; label: string }[] = [
    { code: 'all', label: 'Todos' },
    ...availableSports.map((code) => ({ code, label: sportNames[code] })),
  ];
  const filteredGroups = groups.filter((group) => selectedSport === 'all' || group.sport === selectedSport);
  return <section aria-label="Times favoritos">
    {groups.length > 0 && <nav className="competition-tabs" role="tablist" aria-label="Filtrar por esporte">
      {tabs.map(({ code, label }, index) => (
        <button
          key={code}
          ref={(element) => { tabButtons.current[index] = element; }}
          id={`favorites-tab-${index}`}
          type="button"
          role="tab"
          aria-controls="favorites-panel"
          aria-selected={selectedTabIndex === index}
          tabIndex={selectedTabIndex === index ? 0 : -1}
          data-sport={code === 'all' ? undefined : getSportGroup(code)}
          onClick={() => setSport(code)}
          onKeyDown={(event) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const next = event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? tabs.length - 1
                : (index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
            setSport(tabs[next].code);
            tabButtons.current[next]?.focus();
          }}
        >
          {code !== 'all' && <SportIcon sport={getSportGroup(code)} />}
          {label}
        </button>
      ))}
    </nav>}
    {groups.length === 0 ? <div className="empty-state">
      <Heart size={25} />
      <h3>Seu Vault está livre.</h3>
      <p>Salve times para criar uma agenda feita para você.</p>
      <button className="primary-button" onClick={() => setAdding(true)}>Explorar times</button>
    </div> : <div id="favorites-panel" role="tabpanel" aria-labelledby={`favorites-tab-${selectedTabIndex}`}>
      {filteredGroups.length ? <div className="team-grid">
        {filteredGroups.map(({ team, leagues: competitions }) => <TeamCard key={team.id} team={team} league={competitions.find((league) => league.id === team.leagueId)!} saved onToggle={onToggle} onSelect={onSelect} />)}
      </div> : <div className="empty-state">
        <h3>Nenhum time neste esporte.</h3>
        <p>Escolha outra aba para ver seus favoritos.</p>
        <button className="primary-button" onClick={() => setSport('all')}>Ver todos</button>
      </div>}
    </div>}
    <button type="button" className="vault-fab" onClick={() => setAdding(true)}>
      <Plus size={20} aria-hidden="true" />
      <span>Adicionar time</span>
    </button>
    {adding && <AddTeamDialog teams={teams} leagues={leagues} savedTeamIds={savedTeamIds} onToggle={onToggle} onClose={() => setAdding(false)} />}
  </section>;
}
