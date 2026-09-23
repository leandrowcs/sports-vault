import type { EventSummaryStat, SportEvent, Team } from './sports';

export interface NflSeason { year: number; phase: number; week: number }
export interface NflPhase { phase: number; label: string; weeks: { number: number; label: string; start: string; end: string }[] }
export interface NflEvent extends SportEvent { home: Team; away: Team; seasonYear: number; phase: number; shortStatus: string }
export interface NflStanding { team: Team; seed: number | null; stats: Record<string, string> }
export interface NflDivision { name: string; conference: string; logoUrl?: string; teams: Team[]; rows: NflStanding[] }
export interface NflTeamSeason {
  year: number; warnings: string[]; division?: string; byeWeek?: number; campaign: NflStanding | null;
  statistics: { key: string; label: string; stats: { key: string; label: string; value: string }[] }[];
  events: NflEvent[];
  roster: { key: string; label: string; players: { id: string; name: string; jersey: string; position: string; age?: number; height?: string; weight?: string; photo?: string; status: string }[] }[];
}
export interface NflGame {
  year: number; status: string; live: boolean;
  teams: { team: Team; score: string; periods: string[] }[];
  statistics: EventSummaryStat[];
  players: { team: Team; tables: { key: string; label: string; labels: string[]; players: { id: string; name: string; didNotPlay: boolean; stats: string[] }[] }[] }[];
}
