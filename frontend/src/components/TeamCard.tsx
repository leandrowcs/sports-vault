import { Heart } from "lucide-react";
import { TeamCrest } from "./TeamCrest";
import type { League, Team } from "../types/sports";
export function TeamCard({
  team,
  league,
  saved,
  onToggle,
  onSelect,
}: {
  team: Team;
  league: League;
  saved: boolean;
  onToggle: (id: string) => void;
  onSelect: (team: Team) => void;
}) {
  return (
    <article className="team-card">
      <div className="team-card-top">
        <TeamCrest team={team} />
        <button
          className={saved ? "heart saved" : "heart"}
          onClick={() => onToggle(team.id)}
          aria-label={saved ? `Remover ${team.name}` : `Salvar ${team.name}`}
        >
          <Heart size={18} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
      <button className="team-detail-button" onClick={() => onSelect(team)}>{team.name}</button>
      <p>{team.city}</p>
      <span
        className="competition-dot"
        style={{ "--league-color": league.color } as React.CSSProperties}
      >
        {league.name}
      </span>
    </article>
  );
}
