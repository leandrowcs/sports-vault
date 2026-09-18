import { Heart, Home } from "lucide-react";
import type { FocusGroupId, View } from "../types/sports";

export function SportIcon({ sport, size = 20 }: { sport: FocusGroupId; size?: number }) {
  return (
    <svg className="sport-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {sport === "nba" ? <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3v18M5.6 5.6c7 2 7 10.8 0 12.8M18.4 5.6c-7 2-7 10.8 0 12.8" />
      </> : sport === "nfl" ? <>
        <path d="M3 21C1 10 10 1 21 3c2 11-7 20-18 18Z" />
        <path d="m8 16 8-8M9 11l4 4m-1-7 4 4M3 14l7 7M14 3l7 7" />
      </> : <>
        <circle cx="12" cy="12" r="9" />
        <path d="m12 8 4 3-1.5 4.5h-5L8 11 12 8Zm0-5v5m9 2-5 1m1.5 8-3-3.5m-8 3 3-3M3 10l5 1" />
        {sport === "selecao" && <path className="brazil-ball-panel" d="m12 8 4 3-1.5 4.5h-5L8 11Z" />}
      </>}
    </svg>
  );
}

export function NavigationIcon({ view, size = 20 }: { view: View; size?: number }) {
  if (view === "home") return <Home size={size} aria-hidden="true" />;
  if (view === "favorites") return <Heart size={size} aria-hidden="true" />;
  return <SportIcon sport={view} size={size} />;
}
