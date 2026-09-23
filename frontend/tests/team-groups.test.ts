import assert from 'node:assert/strict';
import { test } from 'node:test';
import { groupTeams, toggleTeamGroup } from '../src/helpers/teamGroups.ts';
import type { League, Team } from '../src/types/sports.ts';

const leagues: League[] = [
  { id: 'domestic', name: 'Liga nacional', country: 'Brasil', sport: 'football', season: '2026', color: '#fff' },
  { id: 'cup', name: 'Copa', country: 'Brasil', sport: 'football', season: '2026', color: '#fff' },
  { id: 'basketball', name: 'Basquete', country: 'Brasil', sport: 'basketball', season: '2026', color: '#fff' },
];
const team = (id: string, leagueId: string, extra: Partial<Team> = {}): Team => ({
  id, leagueId, name: 'Equipe', shortName: 'EQ', city: 'Cidade', color: '#fff', ...extra,
});

test('one team retains both competitions and original IDs', () => {
  const groups = groupTeams([team('domestic-42', 'domestic'), team('cup-42', 'cup', { logoUrl: '/crest.png' })], leagues);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].variants.map((item) => item.id), ['domestic-42', 'cup-42']);
  assert.deepEqual(groups[0].leagues.map((item) => item.id), ['domestic', 'cup']);
  assert.equal(groups[0].team.logoUrl, '/crest.png');
});

test('explicit provider identity groups differently named representations', () => {
  const groups = groupTeams([team('a', 'domestic', { espnTeamId: '205', name: 'Brasil' }), team('b', 'cup', { espnTeamId: '205', name: 'Brazil' })], leagues);
  assert.equal(groups.length, 1);
});

test('matching provider IDs in different sports remain separate', () => {
  assert.equal(groupTeams([team('domestic-42', 'domestic'), team('basketball-42', 'basketball')], leagues).length, 2);
});

test('matching names alone never merge unrelated teams', () => {
  assert.equal(groupTeams([team('local-a', 'domestic'), team('local-b', 'cup')], leagues).length, 2);
});

test('removing an old favorite clears all its competition variants only', () => {
  assert.deepEqual(toggleTeamGroup(['other', 'cup-42'], ['domestic-42', 'cup-42']), ['other']);
  assert.deepEqual(toggleTeamGroup(['other', 'cup-42', 'domestic-42'], ['domestic-42', 'cup-42']), ['other']);
});

test('saving includes all competitions once and preserves existing favorites', () => {
  assert.deepEqual(toggleTeamGroup(['other'], ['domestic-42', 'cup-42', 'cup-42']), ['other', 'domestic-42', 'cup-42']);
});
