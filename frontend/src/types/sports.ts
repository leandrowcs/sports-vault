export type SportCode = 'football' | 'basketball' | 'american_football'
export type GameStatus = 'scheduled' | 'live' | 'finished'
export type View = 'home' | 'vault' | 'games' | 'search'
export interface League { id: string; name: string; country: string; sport: SportCode; season: string; color: string }
export interface Team { id: string; name: string; shortName: string; leagueId: string; city: string; color: string; logoUrl?: string; espnTeamId?: string }
export interface SportEvent { id: string; leagueId: string; homeTeamId: string; awayTeamId: string; startsAt: string; status: GameStatus; venue: string; homeScore?: number; awayScore?: number }
export interface EventSummaryStat { key: string; label: string; homeValue: string; awayValue: string }
export interface EventSummaryLeader { key: string; label: string; homeValue: string; awayValue: string }
export interface SportEventSummary {
  eventId: string
  sport: SportCode
  shortStatus?: string
  note?: string
  statistics: EventSummaryStat[]
  leaders: EventSummaryLeader[]
}
export interface FootballPlayerSeasonStats {
  sport?: 'football'
  season: string
  competitionId: string
  appearances: number
  goals: number
  assists: number
  shotsOnTarget: number
  foulsCommitted: number
  yellowCards: number
  recentRatings: number[]
  percentiles: { goals: number; assists: number; shotsOnTarget: number; appearances: number }
}
export interface Player {
  id: string
  name: string
  teamId: string
  position: string
  age: number
  nationality: string
  marketValueEUR: number
  titles: string[]
  seasons: PlayerSeasonStats[]
}
export interface VaultState { teamIds: string[]; onboarded: boolean }

export interface BasketballPlayerSeasonStats {
  sport: 'basketball'
  season: string
  competitionId: string
  appearances: number
  points?: number
  rebounds?: number
  assists?: number
  steals?: number
  blocks?: number
  threePointersMade?: number
  turnovers?: number
}
export interface AmericanFootballPlayerSeasonStats {
  sport: 'american_football'
  season: string
  competitionId: string
  appearances: number
  passingYards?: number
  passingTouchdowns?: number
  rushingYards?: number
  receivingYards?: number
  touchdowns?: number
  tackles?: number
  sacks?: number
}
export type PlayerSeasonStats = FootballPlayerSeasonStats | BasketballPlayerSeasonStats | AmericanFootballPlayerSeasonStats;
