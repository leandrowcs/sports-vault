import { useState } from "react";
import type { Team } from "../types/sports";

export function TeamCrest({ team }: { team: Team }) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const showLogo = team.logoUrl && team.logoUrl !== failedUrl;

  return (
    <span className={showLogo ? "crest team-crest-image" : "crest"} style={showLogo ? undefined : { backgroundColor: team.color }} aria-hidden="true">
      {showLogo ? (
        <img src={team.logoUrl} alt="" width="48" height="48" loading="lazy" decoding="async" onError={() => setFailedUrl(team.logoUrl)} />
      ) : team.shortName.slice(0, 3)}
    </span>
  );
}
