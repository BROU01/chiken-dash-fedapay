import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { ChickenMark } from "@/components/ChickenMascot";
import SiteHeader from "@/components/SiteHeader";
import { AuthApiError, useAuth } from "@/hooks/useAuth";

const LOGIN_ERRORS: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Email ou mot de passe incorrect.",
};

export default function Login() {
  const { login } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate("/game");
    } catch (err) {
      setError(err instanceof AuthApiError ? LOGIN_ERRORS[err.code] ?? "Connexion impossible." : "Connexion impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="marketing-shell info-page">
      <div className="noise-layer" aria-hidden="true" />
      <SiteHeader />
      <section className="auth-shell">
        <form className="auth-card" onSubmit={handleSubmit}>
          <span className="auth-mark">
            <ChickenMark />
          </span>
          <h1>Connexion</h1>
          <p className="auth-subtitle">Accédez à votre portefeuille et au cockpit.</p>

          <label className="form-field">
            <span>Email</span>
            <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
          </label>
          <label className="form-field">
            <span>Mot de passe</span>
            <input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button className="primary-button" type="submit" disabled={busy}>
            Se connecter <ArrowRight size={17} />
          </button>
          <p className="auth-switch">
            Pas encore de compte ? <a href="/register">Créer un compte</a>
          </p>
        </form>
      </section>
    </main>
  );
}
