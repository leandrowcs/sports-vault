import type { League, Player, Team } from '../types/sports';
import { PlayerVaultPage } from '../pages/PlayerPage';
export function PlayerDialog({ player, team, getLeague, onClose }: { player: Player; team: Team; getLeague: (id: string) => League; onClose: () => void }) {
  return <div className="dialog-backdrop" onMouseDown={onClose}>
    <section className="detail-dialog" role="dialog" aria-modal="true" aria-label={`Estatísticas de ${player.name}`} onMouseDown={(event) => event.stopPropagation()}>
      <button className="dialog-close" aria-label="Fechar atleta" onClick={onClose}>×</button>
      <PlayerVaultPage player={player} team={team} league={getLeague(team.leagueId)} onBack={onClose} />
    </section>
  </div>;
}
