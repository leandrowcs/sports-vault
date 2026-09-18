import { MapPin } from "lucide-react";
import { SportIcon } from "./SportIcon";
import { getFocusGroup } from "../helpers/focusGroups";
import type { League, SportEvent, Team } from "../types/sports";
import { formatEventCardDate } from "../helpers/eventDates";
export function EventCard({
  event,
  home,
  away,
  competition,
  onSelect,
}: {
  event: SportEvent;
  home: Team;
  away: Team;
  competition: League;
  onSelect?: (event: SportEvent) => void;
}) {
  const date = formatEventCardDate(event.startsAt);
  return (
    <article className={onSelect ? "event-card selectable" : "event-card"} onClick={() => onSelect?.(event)} onKeyDown={(keyEvent) => { if (onSelect && (keyEvent.key === "Enter" || keyEvent.key === " ")) { keyEvent.preventDefault(); onSelect(event); } }} role={onSelect ? "button" : undefined} tabIndex={onSelect ? 0 : undefined}>
      <div className="event-meta">
        <span className="event-competition" data-sport={getFocusGroup(competition)}><SportIcon sport={getFocusGroup(competition)} size={16} />{competition.name}</span>
        {event.status === "live" ? (
          <span className="status live">
            <span className="live-dot" />
            AO VIVO
          </span>
        ) : (
          <span className={event.status === "finished" ? "status finished" : "status"}>
            {event.status === "finished" ? `Encerrado · ${date}` : date}
          </span>
        )}
      </div>
      <div className="matchup">
        <div>
          <span className="mini-crest" style={{ backgroundColor: home.color }}>
            {home.shortName.slice(0, 2)}
          </span>
          <b>{home.name}</b>
        </div>
        <strong>
          {event.status === "scheduled"
            ? "vs"
            : `${event.homeScore ?? 0} - ${event.awayScore ?? 0}`}
        </strong>
        <div>
          <span className="mini-crest" style={{ backgroundColor: away.color }}>
            {away.shortName.slice(0, 2)}
          </span>
          <b>{away.name}</b>
        </div>
      </div>
      {event.venue && event.venue !== "A definir" && <p className="venue">
        <MapPin size={14} aria-hidden="true" />
        {event.venue}
      </p>}
    </article>
  );
}
