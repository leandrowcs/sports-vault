import { Heart, Home, Shield, Search, Trophy } from "lucide-react";
export type BottomNavItem = "vault" | "games" | "explore" | "favorites";
export function AppBottomNav({
  active,
  className = "",
  onOpenFavorites,
  onOpenGames,
  onOpenSearch,
  onOpenVault,
}: {
  active: BottomNavItem;
  className?: string;
  onOpenFavorites: () => void;
  onOpenGames: () => void;
  onOpenSearch: () => void;
  onOpenVault: () => void;
}) {
  const items: { id: BottomNavItem; label: string; icon: typeof Shield; onClick: () => void }[] = [
    { id: "vault", label: "Início", icon: Home, onClick: onOpenVault },
    { id: "games", label: "Jogos", icon: Trophy, onClick: onOpenGames },
    { id: "explore", label: "Buscar", icon: Search, onClick: onOpenSearch },
    { id: "favorites", label: "Meu Vault", icon: Heart, onClick: onOpenFavorites },
  ];

  return (
    <nav className={`app-bottom-nav ${className}`.trim()} aria-label="Navegação principal">
      {items.map(({ id, label, icon: Icon, onClick }) => (
        <button key={id} className={active === id ? "active" : ""} aria-current={active === id ? "page" : undefined} onClick={onClick}>
          <Icon size={20} fill={active === id && (id === "vault" || id === "favorites") ? "currentColor" : "none"} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
