import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}
export function InstallAppPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = useState(
    () => localStorage.getItem("sports-vault:install-dismissed") === "true",
  );
  const [isStandalone] = useState(
    () =>
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in window.navigator && window.navigator.standalone === true),
  );

  useEffect(() => {
    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  function dismiss() {
    localStorage.setItem("sports-vault:install-dismissed", "true");
    setIsDismissed(true);
  }

  if (isStandalone || isDismissed || !installPrompt) return null;

  return (
    <aside className="install-app-prompt" aria-label="Instalar Sports Vault">
      <div>
        <Download size={18} />
        <span>
          <b>Instalar Sports Vault</b>
          <small>Acesse como app local, com cache e tela cheia.</small>
        </span>
      </div>
      <button className="install-action" onClick={() => void installApp()}>
        Instalar
      </button>
      <button className="install-dismiss" onClick={dismiss} aria-label="Fechar sugestão de instalação">
        <X size={16} />
      </button>
    </aside>
  );
}
