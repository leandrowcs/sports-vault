import type { FocusGroupId, League, SportEvent, Team } from '../types/sports'

export const FOCUS_GROUPS: { id: FocusGroupId; label: string }[] = [
  { id: 'futebol', label: 'Futebol' },
  { id: 'selecao', label: 'Seleção' },
  { id: 'nba', label: 'NBA' },
  { id: 'nfl', label: 'NFL' },
]

// ESPN team id for the Brazil national team, used to narrow "Seleção" leagues down to Brazil-only matches.
const BRAZIL_ESPN_TEAM_ID = '205'

export function getFocusGroup(league: League): FocusGroupId {
  return league.focusGroup ?? (league.sport === 'basketball' ? 'nba' : league.sport === 'american_football' ? 'nfl' : 'futebol')
}

export function isBrazilTeam(team: Pick<Team, 'espnTeamId' | 'id'>): boolean {
  return team.espnTeamId === BRAZIL_ESPN_TEAM_ID || team.id.endsWith(`-${BRAZIL_ESPN_TEAM_ID}`)
}

export function isBrazilEvent(event: SportEvent, getTeam: (id: string) => Team): boolean {
  return isBrazilTeam(getTeam(event.homeTeamId)) || isBrazilTeam(getTeam(event.awayTeamId))
}

export function leaguesForFocusGroup(leagues: League[], focusGroup: FocusGroupId): League[] {
  return leagues.filter((league) => getFocusGroup(league) === focusGroup)
}
