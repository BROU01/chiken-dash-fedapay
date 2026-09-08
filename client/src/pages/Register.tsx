import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { ChickenMark } from "@/components/ChickenMascot";
import SiteHeader from "@/components/SiteHeader";
import { AuthApiError, useAuth } from "@/hooks/useAuth";

const REGISTER_ERRORS: Record<string, string> = {
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Un compte existe déjà avec cet email.",
  MINIMUM_AGE_NOT_MET: "Chicken Crash est réservé aux personnes majeures (18 ans et plus).",
  PASSWORD_TOO_SHORT: "Le mot de passe doit contenir au moins 8 caractères.",
};

export default function Register() {
  const { register } = useAuth();
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ email: "", password: "", firstName: "", lastName: "", phone: "", birthdate: "" });
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!ageConfirmed) {
      setError("Vous devez confirmer avoir 18 ans ou plus.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await register(form);
      navigate("/game");
    } catch (err) {
      setError(err instanceof AuthApiError ? REGISTER_ERRORS[err.code] ?? "Inscription impossible." : "Inscription impossible.");
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
          <h1>Créer un compte</h1>
          <p className="auth-subtitle">Réservé aux personnes majeures (18+). Jouez avec modération.</p>

          <div className="form-row">
            <label className="form-field">
              <span>Prénom</span>
              <input required value={form.firstName} onChange={(event) => update("firstName", event.target.value)} autoComplete="given-name" />
            </label>
            <label className="form-field">
              <span>Nom</span>
              <input required value={form.lastName} onChange={(event) => update("lastName", event.target.value)} autoComplete="family-name" />
            </label>
          </div>
          <label className="form-field">
            <span>Email</span>
            <input type="email" required value={form.email} onChange={(event) => update("email", event.target.value)} autoComplete="email" />
          </label>
          <label className="form-field">
            <span>Téléphone Mobile Money (avec indicatif)</span>
            <input required placeholder="+229 90 00 00 00" value={form.phone} onChange={(event) => update("phone", event.target.value)} autoComplete="tel" />
          </label>
          <div className="form-row">
            <label className="form-field">
              <span>Date de naissance</span>
              <input type="date" required value={form.birthdate} onChange={(event) => update("birthdate", event.target.value)} />
            </label>
            <label className="form-field">
              <span>Mot de passe</span>
              <input type="password" required minLength={8} value={form.password} onChange={(event) => update("password", event.target.value)} autoComplete="new-password" />
            </label>
          </div>

          <label className="form-check">
            <input type="checkbox" checked={ageConfirmed} onChange={(event) => setAgeConfirmed(event.target.checked)} />
            <span>Je certifie être âgé(e) de 18 ans ou plus et j'accepte de jouer de façon responsable.</span>
          </label>

          {error && <p className="form-error">{error}</p>}

          <button className="primary-button" type="submit" disabled={busy}>
            Créer mon compte <ArrowRight size={17} />
          </button>
          <p className="auth-switch">
            Déjà un compte ? <a href="/login">Se connecter</a>
          </p>
        </form>
      </section>
    </main>
  );
}
