import type { League, Player, SportEvent, Team } from '../types/sports'
import type { SportsProvider } from './SportsProvider'
const leagues: League[] = [
  { id: 'premier-league', name: 'Premier League', country: 'Inglaterra', sport: 'football', season: '2026/27', color: '#5b21b6' }, { id: 'la-liga', name: 'LaLiga', country: 'Espanha', sport: 'football', season: '2026/27', color: '#ef4444' }, { id: 'champions-league', name: 'UEFA Champions League', country: 'Europa', sport: 'football', season: '2026/27', color: '#1d4ed8' }, { id: 'nba', name: 'NBA', country: 'Estados Unidos', sport: 'basketball', season: '2026/27', color: '#ea580c' }, { id: 'nfl', name: 'NFL', country: 'Estados Unidos', sport: 'american_football', season: '2026/27', color: '#7c2d12' },
]
const teams: Team[] = [
  { id: 'arsenal', name: 'Arsenal', shortName: 'ARS', leagueId: 'premier-league', city: 'Londres', color: '#dc2626' }, { id: 'liverpool', name: 'Liverpool', shortName: 'LIV', leagueId: 'premier-league', city: 'Liverpool', color: '#be123c' }, { id: 'realmadrid', name: 'Real Madrid', shortName: 'RMA', leagueId: 'la-liga', city: 'Madrid', color: '#1d4ed8' }, { id: 'barcelona', name: 'Barcelona', shortName: 'BAR', leagueId: 'la-liga', city: 'Barcelona', color: '#b91c1c' }, { id: 'psg', name: 'Paris Saint-Germain', shortName: 'PSG', leagueId: 'champions-league', city: 'Paris', color: '#1d4ed8' }, { id: 'bayern', name: 'Bayern Munich', shortName: 'BAY', leagueId: 'champions-league', city: 'Munique', color: '#dc2626' }, { id: 'celtics', name: 'Boston Celtics', shortName: 'BOS', leagueId: 'nba', city: 'Boston', color: '#15803d' }, { id: 'lakers', name: 'Los Angeles Lakers', shortName: 'LAL', leagueId: 'nba', city: 'Los Angeles', color: '#7e22ce' }, { id: 'chiefs', name: 'Kansas City Chiefs', shortName: 'KC', leagueId: 'nfl', city: 'Kansas City', color: '#e11d48' }, { id: 'niners', name: 'San Francisco 49ers', shortName: 'SF', leagueId: 'nfl', city: 'San Francisco', color: '#b91c1c' },
]
const events: SportEvent[] = [
  { id: 'event-1', leagueId: 'premier-league', homeTeamId: 'arsenal', awayTeamId: 'liverpool', startsAt: '2026-08-28T16:30:00Z', status: 'scheduled', venue: 'Emirates Stadium' }, { id: 'event-2', leagueId: 'la-liga', homeTeamId: 'realmadrid', awayTeamId: 'barcelona', startsAt: '2026-08-29T19:00:00Z', status: 'scheduled', venue: 'Santiago Bernabeu' }, { id: 'event-3', leagueId: 'nba', homeTeamId: 'celtics', awayTeamId: 'lakers', startsAt: '2026-08-30T23:30:00Z', status: 'scheduled', venue: 'TD Garden' }, { id: 'event-4', leagueId: 'champions-league', homeTeamId: 'psg', awayTeamId: 'bayern', startsAt: '2026-08-26T19:00:00Z', status: 'finished', venue: 'Parc des Princes', homeScore: 2, awayScore: 1 }, { id: 'event-5', leagueId: 'nfl', homeTeamId: 'chiefs', awayTeamId: 'niners', startsAt: '2026-08-31T20:20:00Z', status: 'scheduled', venue: 'Arrowhead Stadium' }, { id: 'event-6', leagueId: 'premier-league', homeTeamId: 'arsenal', awayTeamId: 'liverpool', startsAt: '2026-09-09T15:00:00Z', status: 'live', venue: 'Emirates Stadium', homeScore: 1, awayScore: 1 }, { id: 'event-7', leagueId: 'la-liga', homeTeamId: 'barcelona', awayTeamId: 'realmadrid', startsAt: '2026-04-12T19:00:00Z', status: 'finished', venue: 'Spotify Camp Nou', homeScore: 1, awayScore: 3 }, { id: 'event-8', leagueId: 'la-liga', homeTeamId: 'realmadrid', awayTeamId: 'barcelona', startsAt: '2025-10-26T15:15:00Z', status: 'finished', venue: 'Santiago Bernabeu', homeScore: 2, awayScore: 2 }, { id: 'event-9', leagueId: 'la-liga', homeTeamId: 'barcelona', awayTeamId: 'realmadrid', startsAt: '2025-04-27T19:00:00Z', status: 'finished', venue: 'Spotify Camp Nou', homeScore: 0, awayScore: 1 }, { id: 'event-10', leagueId: 'la-liga', homeTeamId: 'realmadrid', awayTeamId: 'barcelona', startsAt: '2024-10-27T15:15:00Z', status: 'finished', venue: 'Santiago Bernabeu', homeScore: 4, awayScore: 0 },
]
const players: Player[] = [
  {
    id: 'vinicius-jr', name: 'Vinicius Jr.', teamId: 'realmadrid', position: 'Ponta Esquerda', age: 26, nationality: 'Brasil', marketValueEUR: 150_000_000,
    titles: ['UEFA Champions League 2024', 'La Liga 2024', 'Copa do Rei 2023'],
    seasons: [{
      season: '2026/27', competitionId: 'la-liga', appearances: 6, goals: 5, assists: 3, xG: 4.2, dribblesPerGame: 4.8, topSpeedKmh: 34.7,
      recentRatings: [7.8, 8.4, 6.9, 9.1, 7.5],
      percentiles: { goals: 92, assists: 84, xG: 88, dribbles: 96, speed: 99 },
    }],
  },
  {
    id: 'salah', name: 'Mohamed Salah', teamId: 'liverpool', position: 'Ponta Direita', age: 33, nationality: 'Egito', marketValueEUR: 55_000_000,
    titles: ['Premier League 2024', 'Champions League 2019'],
    seasons: [{
      season: '2026/27', competitionId: 'premier-league', appearances: 6, goals: 6, assists: 2, xG: 5.1, dribblesPerGame: 2.9, topSpeedKmh: 32.1,
      recentRatings: [8.1, 7.2, 8.9, 7.6, 6.8],
      percentiles: { goals: 95, assists: 70, xG: 93, dribbles: 65, speed: 78 },
    }],
  },
]
export const mockSportsProvider: SportsProvider = { async getLeagues() { return leagues }, async getTeams() { return teams }, async getEvents() { return events }, async getPlayers() { return players } }