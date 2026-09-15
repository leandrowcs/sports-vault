import { ArrowLeft, Star } from 'lucide-react';
import type { League, Player, SportEvent, Team } from '../types/sports';
import { teamMetrics, sportNames, playerMetrics } from '../helpers/sportStatistics';
import { StatisticsGrid } from '../components/StatisticsGrid';
import { TeamCrest } from '../components/TeamCrest';
import { EventCard } from '../components/EventCard';

interface Props {
  team: Team; league: League; events: SportEvent[]; players: Player[]; teams: Team[];
  getTeam: (id: string) => Team; saved: boolean; onBack: () => void;
  onToggleFavorite: () => void; onSelectPlayer: (player: Player) => void;
  onOpenGames?: () => void; onOpenVault?: () => void; onOpenSearch?: () => void;
}
export function TeamVaultPage({ team, league, events, players, getTeam, saved, onBack, onToggleFavorite, onSelectPlayer }: Props) {
  const teamEvents = events.filter((event) => event.leagueId === league.id && (event.homeTeamId === team.id || event.awayTeamId === team.id));
  const upcoming = teamEvents.filter((event) => event.status !== 'finished').sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
  const metrics = teamMetrics(league.sport, team, teamEvents);
  const leaderKeys = { football: ['goals', 'assists'], basketball: ['points', 'rebounds', 'assists'], american_football: ['passingYards', 'rushingYards', 'receivingYards'] }[league.sport];
  const roster = players.filter((player) => player.teamId === team.id);
  const leaders = leaderKeys.flatMap((key) => {
    const candidates = roster.flatMap((player) => {
      const stats = player.seasons.find((season) => season.competitionId === league.id && season.season === league.season);
      const metric = playerMetrics(league.sport, stats).find((item) => item.key === key);
      return metric?.value !== null && metric?.value !== undefined ? [{ player, metric }] : [];
    }).sort((a, b) => b.metric.value! - a.metric.value!);
    return candidates.length ? [candidates[0]] : [];
  });
  return <section className="team-vault-page" aria-label={`${team.name} · ${sportNames[league.sport]}`}>
    <header className="team-vault-topbar">
      <button onClick={onBack} aria-label="Voltar">
        <ArrowLeft size={20} />
      </button>
      <b>
        {sportNames[league.sport]}
      </b>
      <button onClick={onToggleFavorite} aria-label={saved ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}>
        <Star size={20} fill={saved ? 'currentColor' : 'none'} />
      </button>
    </header>
    <section className="team-hero-card">
      <div className="team-hero-content">
        <TeamCrest team={team} />
        <h1>
          {team.name}
        </h1>
        <p>
          {league.name} · {league.country} · {league.season}
        </p>
      </div>
    </section>
    <section className="team-module">
      <header>
        <h2>Próximo jogo</h2>
      </header>
      {upcoming ? <EventCard event={upcoming} home={getTeam(upcoming.homeTeamId)} away={getTeam(upcoming.awayTeamId)} competition={league} /> : <p className="standing-empty">Nenhum próximo jogo disponível.</p>}
    </section>
    <section className="team-module">
      <header>
        <h2>Estatísticas de {sportNames[league.sport]}
        </h2>
      </header>
      <p className="statistics-scope">Calculadas apenas dos jogos concluídos com placar disponível nesta competição. O recorte carregado pode não cobrir toda a temporada.</p>
      {metrics.length ? <StatisticsGrid metrics={metrics} /> : <p className="standing-empty">Sem jogos concluídos com placar disponível.</p>}
    </section>
    <section className="team-module">
      <header>
        <h2>Destaques da temporada</h2>
      </header>
      {leaders.length ? <div className="leader-grid">
        {leaders.map(({ player, metric }) => <article className="leader-card" key={metric.key}>
          <span>
            {metric.label}
          </span>
          <button className="team-detail-button" onClick={() => onSelectPlayer(player)}>
            {player.name}
          </button>
          <strong>
            {metric.value}
          </strong>
          <small>Total · {league.season}
          </small>
        </article>)}
      </div> : <p className="standing-empty">Estatísticas individuais de {sportNames[league.sport]} indisponíveis nesta temporada.</p>}
    </section>
    <section className="team-module lineup-module">
      <header>
        <h2>Elenco</h2>
      </header>
      {roster.length ? <div className="lineup-list">
        {roster.map((player) => <button key={player.id} onClick={() => onSelectPlayer(player)}>
          <div>
            <b>
              {player.name}
            </b>
            <small>
              {player.position}{player.age > 0 ? ` · ${player.age} anos` : ''}
            </small>
          </div>
        </button>)}
      </div> : <p className="standing-empty">Elenco não disponibilizado pelo provedor.</p>}
    </section>
  </section>;
}
