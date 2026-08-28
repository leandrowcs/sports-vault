export type SportCode = 'football' | 'basketball'
export type GameStatus = 'scheduled' | 'finished'
export type View = 'home' | 'vault' | 'games' | 'search'
export interface League { id: string; name: string; country: string; sport: SportCode; season: string; color: string }
export interface Team { id: string; name: string; shortName: string; leagueId: string; city: string; color: string }
export interface SportEvent { id: string; leagueId: string; homeTeamId: string; awayTeamId: string; startsAt: string; status: GameStatus; venue: string; homeScore?: number; awayScore?: number }
export interface VaultState { teamIds: string[] }