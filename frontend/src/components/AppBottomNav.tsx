import { CircleDot, Flag, Goal, Heart, Home, Shield } from "lucide-react";
import type { View } from "../types/sports";
export type BottomNavItem = View;
const items: { id: BottomNavItem; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Início", icon: Home },
  { id: "nba", label: "NBA", icon: CircleDot },
  { id: "nfl", label: "NFL", icon: Shield },
  { id: "futebol", label: "Futebol", icon: Goal },
  { id: "selecao", label: "Brasil", icon: Flag },
  { id: "favorites", label: "Favoritos", icon: Heart },
];
export function AppBottomNav({
  active,
  className = "",
  onNavigate,
}: {
  active: BottomNavItem;
  className?: string;
  onNavigate: (view: BottomNavItem) => void;
}) {
  return (
    <nav className={`app-bottom-nav ${className}`.trim()} aria-label="Navegação principal">
      {items.map(({ id, label, icon: Icon }) => (
        <button key={id} className={active === id ? "active" : ""} aria-current={active === id ? "page" : undefined} onClick={() => onNavigate(id)}>
          <Icon size={18} fill={active === id && id === "favorites" ? "currentColor" : "none"} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
