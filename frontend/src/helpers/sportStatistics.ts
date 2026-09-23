import type { PlayerSeasonStats, SportCode, SportEvent, Team } from '../types/sports';

export const sportNames: Record<SportCode, string> = {
  football: 'Futebol', basketball: 'Basquete', american_football: 'Futebol americano',
};
export interface SportMetric { key: string; label: string; value: number | null }
const metric = (key: string, label: string, value: number | undefined): SportMetric => ({ key, label, value: value !== undefined && Number.isFinite(value) ? value : null });

export function playerMetrics(sport: SportCode, stats?: PlayerSeasonStats): SportMetric[] {
  if (!stats || (stats.sport ?? 'football') !== sport) return [];
  if (stats.sport === 'basketball') return [
    metric('appearances', 'Jogos', stats.appearances), metric('points', 'Pontos', stats.points),
    metric('rebounds', 'Rebotes', stats.rebounds), metric('assists', 'Assistências', stats.assists),
    metric('steals', 'Roubos de bola', stats.steals), metric('blocks', 'Tocos', stats.blocks),
    metric('threePointersMade', 'Cestas de três', stats.threePointersMade), metric('turnovers', 'Perdas de bola', stats.turnovers),
  ];
  if (stats.sport === 'american_football') return [
    metric('appearances', 'Jogos', stats.appearances), metric('passingYards', 'Jardas de passe', stats.passingYards),
    metric('passingTouchdowns', 'Touchdowns de passe', stats.passingTouchdowns), metric('rushingYards', 'Jardas corridas', stats.rushingYards),
    metric('receivingYards', 'Jardas recebidas', stats.receivingYards), metric('touchdowns', 'Touchdowns', stats.touchdowns),
    metric('tackles', 'Tackles', stats.tackles), metric('sacks', 'Sacks', stats.sacks),
  ];
  return [metric('appearances', 'Jogos', stats.appearances), metric('goals', 'Gols', stats.goals),
  metric('assists', 'Assistências', stats.assists), metric('shotsOnTarget', 'Chutes no gol', stats.shotsOnTarget),
  metric('foulsCommitted', 'Faltas cometidas', stats.foulsCommitted), metric('yellowCards', 'Cartões amarelos', stats.yellowCards)];
}

export function teamMetrics(sport: SportCode, team: Team, events: SportEvent[]): SportMetric[] {
  const games = events.filter((event) => event.leagueId === team.leagueId && event.status === 'finished'
    && (event.homeTeamId === team.id || event.awayTeamId === team.id)
    && Number.isFinite(event.homeScore) && Number.isFinite(event.awayScore));
  if (!games.length) return [];
  const scores = games.map((event) => event.homeTeamId === team.id
    ? [event.homeScore!, event.awayScore!] : [event.awayScore!, event.homeScore!]);
  const scored = scores.reduce((sum, [own]) => sum + own, 0);
  const conceded = scores.reduce((sum, [, other]) => sum + other, 0);
  const wins = scores.filter(([a, b]) => a > b).length;
  const common = [metric('games', 'Jogos concluídos', games.length), metric('wins', 'Vitórias', wins), metric('losses', 'Derrotas', scores.filter(([a, b]) => a < b).length)];
  if (sport === 'football') return [...common, metric('draws', 'Empates', scores.filter(([a, b]) => a === b).length),
  metric('goalsFor', 'Gols marcados', scored), metric('goalsAgainst', 'Gols sofridos', conceded), metric('goalDifference', 'Saldo de gols', scored - conceded), metric('cleanSheets', 'Jogos sem sofrer gol', scores.filter(([, b]) => b === 0).length)];
  if (sport === 'basketball') return [...common, metric('winPercentage', 'Vitórias (%)', wins / games.length * 100),
  metric('pointsPerGame', 'Pontos por jogo', scored / games.length), metric('opponentPointsPerGame', 'Pontos sofridos por jogo', conceded / games.length)];
  return [...common, metric('ties', 'Empates', scores.filter(([a, b]) => a === b).length), metric('pointsFor', 'Pontos marcados', scored), metric('pointsAgainst', 'Pontos sofridos', conceded), metric('pointDifference', 'Saldo de pontos', scored - conceded)];
}
