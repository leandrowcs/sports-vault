import type { NbaConference, NbaStanding } from '../types/nba';

function record(row: NbaStanding) {
  const wins = Number(row.stats.wins);
  const losses = Number(row.stats.losses);
  const valid = row.stats.wins !== undefined && row.stats.losses !== undefined && Number.isFinite(wins) && Number.isFinite(losses);
  return { wins, losses, valid, percentage: valid && wins + losses > 0 ? wins / (wins + losses) : -1 };
}

export function overallStandings(conferences: NbaConference[]): NbaStanding[] {
  const rows = [...new Map(conferences.flatMap((group) => group.rows).map((row) => [row.team.id, row])).values()]
    .sort((a, b) => record(b).percentage - record(a).percentage || (record(b).valid ? record(b).wins : -1) - (record(a).valid ? record(a).wins : -1) || a.team.name.localeCompare(b.team.name));
  const leader = rows[0] ? record(rows[0]) : null;
  let position = 1;
  return rows.map((row, index) => {
    const current = record(row);
    const previous = index > 0 ? record(rows[index - 1]) : null;
    if (!previous || current.percentage !== previous.percentage || current.wins !== previous.wins) position = index + 1;
    const behind = leader?.valid && current.valid ? (leader.wins - current.wins + current.losses - leader.losses) / 2 : null;
    return { ...row, position, stats: { ...row.stats, gamesBehind: behind === null ? '—' : behind === 0 ? '-' : String(behind) } };
  });
}
