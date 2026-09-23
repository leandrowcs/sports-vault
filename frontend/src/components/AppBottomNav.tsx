import { NavigationIcon } from "./SportIcon";
import { FOCUS_GROUPS } from "../helpers/focusGroups";
import type { View } from "../types/sports";
export type BottomNavItem = View;
const items: { id: BottomNavItem; label: string }[] = [
  { id: "home", label: "Início" },
  ...FOCUS_GROUPS,
  { id: "favorites", label: "Favoritos" },
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
      {items.map(({ id, label }) => (
        <button key={id} data-sport={id} className={active === id ? "active" : ""} aria-current={active === id ? "page" : undefined} onClick={() => onNavigate(id)}>
          <NavigationIcon view={id} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
