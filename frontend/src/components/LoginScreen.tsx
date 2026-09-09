import { LogIn, Trophy } from "lucide-react";

interface LoginScreenProps {
  isConfigured: boolean;
  isLoading: boolean;
  error: string | null;
  onSignIn: () => void;
}

export function LoginScreen({ isConfigured, isLoading, error, onSignIn }: LoginScreenProps) {
  return (
    <div className="login-screen">
      <div className="login-card">
        <span className="brand-mark">
          <Trophy size={22} />
        </span>
        <h1>Sports Vault</h1>
        <p>Entre com sua conta Google para acessar seu painel esportivo.</p>
        {isConfigured ? (
          <button className="primary-button" disabled={isLoading} onClick={onSignIn}>
            <LogIn size={18} />
            {isLoading ? "Verificando sessão..." : "Entrar com Google"}
          </button>
        ) : (
          <p className="sync-error" role="alert">
            Login indisponível: configure as variáveis do Firebase para habilitar o acesso.
          </p>
        )}
        {error && (
          <p className="sync-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
