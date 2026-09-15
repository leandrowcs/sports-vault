import type { SportEvent } from "../types/sports";
export const eventCardDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});
export const eventDetailDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: "UTC",
});
export function formatEventCardDate(startsAt: string) {
  return eventCardDateFormatter.format(new Date(startsAt));
}
export function formatEventDetailDate(startsAt: string) {
  return eventDetailDateFormatter.format(new Date(startsAt));
}
export function formatEventDetailStatus(event: SportEvent) {
  const score = `${event.homeScore ?? 0} - ${event.awayScore ?? 0}`;
  const dateLabel = formatEventDetailDate(event.startsAt);

  if (event.status === "finished") return `${score} · ${dateLabel}`;
  if (event.status === "live") return `${score} · Ao vivo · ${dateLabel}`;
  return dateLabel;
}
export function formatShortKickoff(startsAt: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(startsAt));
}
export function shortPlayerName(name: string) {
  const parts = name.split(" ");
  return parts.length > 1 ? `${parts[0][0]}. ${parts.at(-1)}` : name;
}
