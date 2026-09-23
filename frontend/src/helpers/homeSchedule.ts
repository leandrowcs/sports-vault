import type { SportEvent } from "../types/sports";
import { EVENT_TIME_ZONE, eventDateKey } from "./eventDates";

const dayFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: EVENT_TIME_ZONE });

export function currentWeekStart(date = new Date()) {
  const start = new Date(`${eventDateKey(date)}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7);
  return start.toISOString().slice(0, 10);
}

export function shiftCalendarDate(date: string, days: number) {
  const shifted = new Date(`${date}T12:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

export function weekLabel(event: SportEvent): string {
  if (event.week) return `${event.seasonPhase ? `${event.seasonPhase} · ` : ""}Semana ${event.week}`;
  // Anchor Montreal's calendar date at UTC noon for DST-independent day arithmetic.
  const start = new Date(`${currentWeekStart(new Date(event.startsAt))}T12:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return `Semana de ${dayFormatter.format(start)} a ${dayFormatter.format(end)}`;
}

export function groupSchedule<T extends SportEvent>(events: T[], keyOf: (event: T) => string) {
  const groups = new Map<string, T[]>();
  [...events].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)).forEach((event) => {
    const key = keyOf(event);
    groups.set(key, [...(groups.get(key) ?? []), event]);
  });
  return [...groups.entries()];
}

export function eventDay(event: Pick<SportEvent, 'startsAt'>) {
  return dayFormatter.format(new Date(event.startsAt));
}
