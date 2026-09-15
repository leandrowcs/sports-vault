import type { League, SportCode, Team } from '../types/sports';

export interface TeamGroup {
  id: string;
  sport: SportCode;
  team: Team;
  variants: Team[];
  leagues: League[];
}

export function groupTeams(teams: Team[], leagues: League[]): TeamGroup[] {
  const leagueById = new Map(leagues.map((league) => [league.id, league]));
  const groups = new Map<string, TeamGroup>();
  for (const team of teams) {
    const league = leagueById.get(team.leagueId);
    if (!league) continue;
    // Older API responses already encode the ESPN ID after the exact league prefix.
    const suffix = team.id.startsWith(`${league.id}-`) ? team.id.slice(league.id.length + 1) : '';
    const providerId = team.espnTeamId ?? (/^\d+$/.test(suffix) ? suffix : undefined);
    const id = `${league.sport}:${providerId ? `espn:${providerId}` : `local:${team.id}`}`;
    const group = groups.get(id);
    if (group) {
      if (!group.variants.some((variant) => variant.id === team.id)) group.variants.push(team);
      if (!group.leagues.some((item) => item.id === league.id)) group.leagues.push(league);
      if (!group.team.logoUrl && team.logoUrl) group.team = team;
    } else {
      groups.set(id, { id, sport: league.sport, team, variants: [team], leagues: [league] });
    }
  }
  return [...groups.values()].sort((a, b) => a.team.name.localeCompare(b.team.name, 'pt-BR'));
}

export function toggleTeamGroup(savedIds: string[], variantIds: string[]): string[] {
  const variants = new Set(variantIds);
  return savedIds.some((id) => variants.has(id))
    ? savedIds.filter((id) => !variants.has(id))
    : [...new Set([...savedIds, ...variantIds])];
}
