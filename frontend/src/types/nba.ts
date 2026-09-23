import type { EventSummaryStat, SportEvent, Team } from './sports';

export interface NbaSeason { year: number; label: string; phase: number }
export interface NbaEvent extends SportEvent { home: Team; away: Team; seasonYear: number; shortStatus: string }
export interface NbaStanding { team: Team; position: number; stats: Record<string, string> }
export interface NbaConference { name: string; rows: NbaStanding[] }
export interface NbaFinalSeries {
  id: string;
  label: string;
  games: NbaEvent[];
  teams: { team: Team; wins: number }[];
  champion: Team | null;
}
export interface NbaTeamSeason {
  year: number;
  warnings: string[];
  campaign: NbaStanding | null;
  averages: { key: string; label: string; value: string }[];
  events: NbaEvent[];
  roster: { id: string; name: string; jersey: string; position: string; age?: number; height?: string; photo?: string }[];
}
export interface NbaGame {
  year: number;
  status: string;
  live: boolean;
  teams: { team: Team; score: string; periods: string[] }[];
  statistics: EventSummaryStat[];
  players: { team: Team; tables: { labels: string[]; players: { id: string; name: string; starter: boolean; didNotPlay: boolean; stats: string[] }[] }[] }[];
}
