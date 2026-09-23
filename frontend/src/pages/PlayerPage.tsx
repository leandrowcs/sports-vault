import { useState } from 'react';
import { ArrowLeft, CircleUserRound } from 'lucide-react';
import type { League, Player, Team } from '../types/sports';
import { playerMetrics, sportNames } from '../helpers/sportStatistics';
import { StatisticsGrid } from '../components/StatisticsGrid';

interface Props {
  player: Player; team: Team; league: League; onBack: () => void;
  onOpenGames?: () => void; onOpenVault?: () => void; onOpenSearch?: () => void;
}
export function PlayerVaultPage({ player, team, league, onBack }: Props) {
  const [seasonIndex, setSeasonIndex] = useState(0);
  const seasons = player.seasons.filter((season) => (season.sport ?? 'football') === league.sport && season.competitionId === league.id);
  const stats = seasons[seasonIndex] ?? seasons[0];
  const metrics = playerMetrics(league.sport, stats);
  return <section className="player-vault-page" aria-label={`Estatísticas de ${player.name}`}>
    <header className="player-vault-topbar">
      <button onClick={onBack} aria-label="Voltar">
        <ArrowLeft size={20} />
      </button>
      <b>
        {sportNames[league.sport]} · Atleta</b>
    </header>
    <section className="player-hero-card">
      <div className="player-avatar-card">
        <CircleUserRound size={54} />
      </div>
      <div className="player-hero-info">
        <h1>
          {player.name}
        </h1>
        <p>
          {team.name} · {player.position}
        </p>
        <p>
          {player.nationality}{player.age > 0 ? ` · ${player.age} anos` : ''}
        </p>
      </div>
    </section>
    {seasons.length > 0 && <label className="season-filter">Temporada<select value={seasonIndex} onChange={(event) => setSeasonIndex(Number(event.target.value))}>
      {seasons.map((season, index) => <option key={`${season.season}-${season.competitionId}`} value={index}>
        {season.season} · {league.name}
      </option>)}
    </select>
    </label>}
    <section className="player-metrics-section">
      <div className="player-section-header">
        <h2>Estatísticas de {sportNames[league.sport]}
        </h2>
        <span>Totais da temporada</span>
      </div>
      {metrics.length ? <StatisticsGrid metrics={metrics} /> : <div className="empty-state">
        <h3>Estatísticas indisponíveis.</h3>
        <p>Não há dados de {sportNames[league.sport]} para este atleta nesta competição.</p>
      </div>}
    </section>
    <section className="player-panel">
      <h2>Títulos</h2>
      {player.titles.length ? <ul>
        {player.titles.map((title) => <li key={title}>
          {title}
        </li>)}
      </ul> : <p className="standing-empty">Nenhum título informado.</p>}
    </section>
  </section>;
}
