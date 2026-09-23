import type { League, Player, SportEvent, SportEventSummary, Team } from '../types/sports'
import type { SportsProvider } from './SportsProvider'
const leagues: League[] = [
  { id: 'brasileirao-a', name: 'Brasileirão Série A', country: 'Brasil', sport: 'football', season: '2026', color: '#16a34a', focusGroup: 'futebol' }, { id: 'copa-do-brasil', name: 'Copa do Brasil', country: 'Brasil', sport: 'football', season: '2026', color: '#facc15', focusGroup: 'futebol' }, { id: 'amistosos-internacionais', name: 'International Friendly', country: 'Internacional', sport: 'football', season: '2026', color: '#38bdf8', focusGroup: 'selecao' }, { id: 'nba', name: 'NBA', country: 'Estados Unidos', sport: 'basketball', season: '2026/27', color: '#ea580c', focusGroup: 'nba' }, { id: 'nfl', name: 'NFL', country: 'Estados Unidos', sport: 'american_football', season: '2026/27', color: '#7c2d12', focusGroup: 'nfl' },
]
const teams: Team[] = [
  { id: 'flamengo', name: 'Flamengo', shortName: 'FLA', leagueId: 'brasileirao-a', city: 'Rio de Janeiro', color: '#dc2626' }, { id: 'palmeiras', name: 'Palmeiras', shortName: 'PAL', leagueId: 'brasileirao-a', city: 'São Paulo', color: '#15803d' }, { id: 'brazil', name: 'Brasil', shortName: 'BRA', leagueId: 'amistosos-internacionais', city: 'CBF', color: '#16a34a', espnTeamId: '205' }, { id: 'argentina', name: 'Argentina', shortName: 'ARG', leagueId: 'amistosos-internacionais', city: 'AFA', color: '#38bdf8', espnTeamId: '202' }, { id: 'celtics', name: 'Boston Celtics', shortName: 'BOS', leagueId: 'nba', city: 'Boston', color: '#15803d' }, { id: 'lakers', name: 'Los Angeles Lakers', shortName: 'LAL', leagueId: 'nba', city: 'Los Angeles', color: '#7e22ce' }, { id: 'chiefs', name: 'Kansas City Chiefs', shortName: 'KC', leagueId: 'nfl', city: 'Kansas City', color: '#e11d48' }, { id: 'niners', name: 'San Francisco 49ers', shortName: 'SF', leagueId: 'nfl', city: 'San Francisco', color: '#b91c1c' },
]
const events: SportEvent[] = [
  { id: 'event-1', leagueId: 'brasileirao-a', homeTeamId: 'flamengo', awayTeamId: 'palmeiras', startsAt: '2026-08-28T16:30:00Z', status: 'scheduled', venue: 'Maracanã' }, { id: 'event-2', leagueId: 'amistosos-internacionais', homeTeamId: 'brazil', awayTeamId: 'argentina', startsAt: '2026-08-29T19:00:00Z', status: 'scheduled', venue: 'Maracanã' }, { id: 'event-3', leagueId: 'nba', homeTeamId: 'celtics', awayTeamId: 'lakers', startsAt: '2026-08-30T23:30:00Z', status: 'scheduled', venue: 'TD Garden' }, { id: 'event-5', leagueId: 'nfl', homeTeamId: 'chiefs', awayTeamId: 'niners', startsAt: '2026-08-31T20:20:00Z', status: 'scheduled', venue: 'Arrowhead Stadium' }, { id: 'event-6', leagueId: 'brasileirao-a', homeTeamId: 'flamengo', awayTeamId: 'palmeiras', startsAt: '2026-09-09T15:00:00Z', status: 'live', venue: 'Maracanã', homeScore: 1, awayScore: 1 },
]
const players: Player[] = [
  {
    id: 'gabigol', name: 'Gabriel Barbosa', teamId: 'flamengo', position: 'Atacante', age: 30, nationality: 'Brasil', marketValueEUR: 8_000_000,
    titles: ['Brasileirão 2024', 'Copa do Brasil 2023'],
    seasons: [{
      season: '2026', competitionId: 'brasileirao-a', appearances: 6, goals: 5, assists: 3, shotsOnTarget: 14, foulsCommitted: 4, yellowCards: 1,
      recentRatings: [7.8, 8.4, 6.9, 9.1, 7.5],
      percentiles: { goals: 92, assists: 84, shotsOnTarget: 88, appearances: 70 },
    }],
  },
]
const eventSummaries: Record<string, SportEventSummary> = {
  'event-6': {
    eventId: 'event-6',
    sport: 'football',
    shortStatus: 'Ao vivo',
    note: 'Flamengo pressiona mais, mas o Palmeiras responde em transições rápidas.',
    statistics: [
      { key: 'goals', label: 'Gols', homeValue: '1', awayValue: '1' },
      { key: 'shots', label: 'Chutes', homeValue: '11', awayValue: '8' },
      { key: 'shots-on-target', label: 'Chutes no gol', homeValue: '5', awayValue: '3' },
      { key: 'possession', label: 'Posse de bola', homeValue: '61%', awayValue: '39%' },
      { key: 'passes', label: 'Passes certos', homeValue: '347', awayValue: '228' },
      { key: 'yellow-cards', label: 'Cartões amarelos', homeValue: '1', awayValue: '2' },
    ],
    leaders: [
      { key: 'top-scorer', label: 'Artilheiro', homeValue: 'Gabigol · 1 gol', awayValue: 'Rony · 1 gol' },
      { key: 'duels', label: 'Duelos ganhos', homeValue: 'Pulgar · 7', awayValue: 'Zé Rafael · 6' },
    ],
  },
  'event-3': {
    eventId: 'event-3',
    sport: 'basketball',
    shortStatus: 'Pré-jogo',
    note: 'Confronto de alto pace com vantagem no perímetro para Boston.',
    statistics: [
      { key: 'points', label: 'Média de pontos', homeValue: '118.7', awayValue: '114.1' },
      { key: 'three-point', label: '3PT convertidos', homeValue: '15.8', awayValue: '13.2' },
      { key: 'paint', label: 'Pontos no garrafão', homeValue: '49.4', awayValue: '46.1' },
      { key: 'free-throws', label: 'Lances livres', homeValue: '82%', awayValue: '79%' },
      { key: 'rebounds', label: 'Rebotes', homeValue: '45.6', awayValue: '43.8' },
      { key: 'turnovers', label: 'Turnovers', homeValue: '11.9', awayValue: '13.4' },
    ],
    leaders: [
      { key: 'scoring', label: 'Pontuador', homeValue: 'Tatum · 29.8 PTS', awayValue: 'Dončić · 31.1 PTS' },
      { key: 'three-threat', label: 'Ameaça do perímetro', homeValue: 'Brown · 2.8 3PT', awayValue: 'Reaves · 2.6 3PT' },
    ],
  },
  'event-5': {
    eventId: 'event-5',
    sport: 'american_football',
    shortStatus: 'Pré-jogo',
    note: 'Ataque aéreo dos Chiefs enfrenta defesa física e agressiva dos 49ers.',
    statistics: [
      { key: 'touchdowns', label: 'Touchdowns por jogo', homeValue: '3.1', awayValue: '2.8' },
      { key: 'passing-yards', label: 'Jardas aéreas', homeValue: '287', awayValue: '246' },
      { key: 'rushing-yards', label: 'Jardas terrestres', homeValue: '104', awayValue: '136' },
      { key: 'turnovers', label: 'Turnovers forçados', homeValue: '1.6', awayValue: '1.9' },
      { key: 'field-goals', label: 'Kicks convertidos', homeValue: '2.1', awayValue: '1.8' },
      { key: 'sacks', label: 'Sacks', homeValue: '2.4', awayValue: '3.1' },
    ],
    leaders: [
      { key: 'qb', label: 'QB em destaque', homeValue: 'Mahomes · 2.4 TD', awayValue: 'Purdy · 2.1 TD' },
      { key: 'takeaways', label: 'Takeaways', homeValue: 'McDuffie · 3 INT', awayValue: 'Warner · 2 FF' },
    ],
  },
}

export const mockSportsProvider: SportsProvider = {
  async getLeagues() { return leagues },
  async getTeams() { return teams },
  async getEvents() { return events },
  async getPlayers() { return players },
  async getEventSummary(event) { return eventSummaries[event.id] ?? null },
}