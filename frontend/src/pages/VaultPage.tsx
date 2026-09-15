import { Heart } from 'lucide-react';
import type { League, Team } from '../types/sports';
import { groupTeams } from '../helpers/teamGroups';
import { TeamCard } from '../components/TeamCard';
export function VaultPage({ favorites, leagues, onToggle, onSelect, onSearch }: { favorites: Team[]; leagues: League[]; onToggle: (id: string) => void; onSelect: (team: Team) => void; onSearch: () => void }) {
  const groups = groupTeams(favorites, leagues);
  return <section aria-label="Times do Meu Vault">
    <div className="page-intro">
      <p>Times escolhidos para a sua biblioteca.</p>
    </div>
    {groups.length ? <div className="team-grid">
      {groups.map(({ team, leagues: competitions }) => <TeamCard key={team.id} team={team} league={competitions.find((league) => league.id === team.leagueId)!} saved onToggle={onToggle} onSelect={onSelect} />)}
    </div> : <div className="empty-state">
      <Heart size={25} />
      <h3>Seu Vault está livre.</h3>
      <p>Salve times para criar uma agenda feita para você.</p>
      <button className="primary-button" onClick={onSearch}>Explorar times</button>
    </div>}
  </section>;
}
