import { Heart, Home, Trophy } from "lucide-react";
export type BottomNavItem = "home" | "competitions" | "favorites";
export function AppBottomNav({
  active,
  className = "",
  onOpenCompetitions,
  onOpenFavorites,
  onOpenHome,
}: {
  active: BottomNavItem;
  className?: string;
  onOpenCompetitions: () => void;
  onOpenFavorites: () => void;
  onOpenHome: () => void;
}) {
  const items: { id: BottomNavItem; label: string; icon: typeof Home; onClick: () => void }[] = [
    { id: "home", label: "Início", icon: Home, onClick: onOpenHome },
    { id: "competitions", label: "Competições", icon: Trophy, onClick: onOpenCompetitions },
    { id: "favorites", label: "Favoritos", icon: Heart, onClick: onOpenFavorites },
  ];

  return (
    <nav className={`app-bottom-nav ${className}`.trim()} aria-label="Navegação principal">
      {items.map(({ id, label, icon: Icon, onClick }) => (
        <button key={id} className={active === id ? "active" : ""} aria-current={active === id ? "page" : undefined} onClick={onClick}>
          <Icon size={20} fill={active === id && id === "favorites" ? "currentColor" : "none"} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
