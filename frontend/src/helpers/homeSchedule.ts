import type { SportEvent } from "../types/sports";

const dayFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

export function weekLabel(event: SportEvent): string {
  if (event.week) return `${event.seasonPhase ? `${event.seasonPhase} · ` : ""}Semana ${event.week}`;
  const start = new Date(event.startsAt);
  start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return `Semana de ${dayFormatter.format(start)} a ${dayFormatter.format(end)}`;
}

export function groupSchedule(events: SportEvent[], keyOf: (event: SportEvent) => string) {
  const groups = new Map<string, SportEvent[]>();
  [...events].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)).forEach((event) => {
    const key = keyOf(event);
    groups.set(key, [...(groups.get(key) ?? []), event]);
  });
  return [...groups.entries()];
}

export function eventDay(event: SportEvent) {
  return dayFormatter.format(new Date(event.startsAt));
}
