import type { SportEvent } from "../types/sports";
export const EVENT_TIME_ZONE = "America/Toronto";
export function eventTimeZoneLabel(date: Date = new Date()) {
  const offset = new Intl.DateTimeFormat("en-US", { timeZone: EVENT_TIME_ZONE, timeZoneName: "shortOffset" })
    .formatToParts(date).find((part) => part.type === "timeZoneName")?.value;
  return offset === "GMT-4" ? "UTC-4 (Eastern Daylight Time)" : "UTC-5 (Eastern Standard Time)";
}
export function eventDateKey(date: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: EVENT_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export const eventCardDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: EVENT_TIME_ZONE,
});
export const eventDetailDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: EVENT_TIME_ZONE,
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
    timeZone: EVENT_TIME_ZONE,
  }).format(new Date(startsAt));
}
export function shortPlayerName(name: string) {
  const parts = name.split(" ");
  return parts.length > 1 ? `${parts[0][0]}. ${parts.at(-1)}` : name;
}
