import { useState } from 'react';
import { Heart, Search } from 'lucide-react';
import type { League, SportCode, Team } from '../types/sports';
import { groupTeams } from '../helpers/teamGroups';
import { sportNames } from '../helpers/sportStatistics';
import { SportIcon } from "../components/SportIcon";
import { getSportGroup } from "../helpers/focusGroups";
import { TeamCard } from '../components/TeamCard';
export function VaultPage({ favorites, leagues, onToggle, onSelect, onSearch }: { favorites: Team[]; leagues: League[]; onToggle: (id: string) => void; onSelect: (team: Team) => void; onSearch: () => void }) {
  const groups = groupTeams(favorites, leagues);
  const availableSports = [...new Set(groups.map((group) => group.sport))];
  const [sport, setSport] = useState<SportCode | 'all'>('all');
  const filteredGroups = groups.filter((group) => sport === 'all' || group.sport === sport);
  return <section aria-label="Times favoritos">
    <div className="page-intro">
      <div className="page-intro-row">
        <p>{groups.length} {groups.length === 1 ? "time salvo" : "times salvos"}</p>
        {groups.length > 0 && <button className="icon-button" aria-label="Buscar times" onClick={onSearch}><Search size={20} /></button>}
      </div>
    </div>
    {groups.length > 0 && availableSports.length > 1 && <nav className="competition-filters" aria-label="Filtrar por esporte">
      <button aria-pressed={sport === 'all'} onClick={() => setSport('all')}>Todos</button>
      {availableSports.map((code) => <button key={code} data-sport={getSportGroup(code)} aria-pressed={sport === code} onClick={() => setSport(code)}><SportIcon sport={getSportGroup(code)} />{sportNames[code]}</button>)}
    </nav>}
    {filteredGroups.length ? <div className="team-grid">
      {filteredGroups.map(({ team, leagues: competitions }) => <TeamCard key={team.id} team={team} league={competitions.find((league) => league.id === team.leagueId)!} saved onToggle={onToggle} onSelect={onSelect} />)}
    </div> : <div className="empty-state">
      <Heart size={25} />
      <h3>Seu Vault está livre.</h3>
      <p>Salve times para criar uma agenda feita para você.</p>
      <button className="primary-button" onClick={onSearch}>Explorar times</button>
    </div>}
  </section>;
}
