import { ArrowRight, Check, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";

const checks = [
  "Une graine serveur (server seed) est générée et son empreinte SHA-256 publiée avant l'ouverture des mises",
  "Le point de crash est dérivé de cette graine par HMAC-SHA256, combinée au numéro de manche (nonce)",
  "Une fois la manche terminée, la graine serveur en clair est publiée",
  "Vous pouvez recalculer vous-même sha256(graine) et le HMAC pour vérifier le résultat",
];

export default function Fairness() {
  return (
    <main className="marketing-shell info-page fairness-page">
      <div className="noise-layer" aria-hidden="true" />
      <SiteHeader active="/fairness" />
      <section className="info-hero">
        <span className="kicker">
          <ShieldCheck size={14} /> LE MODÈLE D'ÉQUITÉ
        </span>
        <h1>
          Faites confiance au vol.
          <br />
          <em>Vérifiez l'atterrissage.</em>
        </h1>
        <p>Chaque manche est calculée côté serveur selon un schéma « commit-reveal » : rien n'est décidé après coup.</p>
      </section>
      <section className="fairness-layout">
        <div className="fairness-visual">
          <div className="fairness-lock">
            <LockKeyhole size={23} />
          </div>
          <div className="fairness-hash">
            <span>ENGAGEMENT (AVANT LA MANCHE)</span>
            <code>sha256(graine_serveur)</code>
          </div>
          <div className="fairness-lines">
            <span />
            <span />
            <span />
          </div>
        </div>
        <div className="fairness-content">
          <span className="eyebrow">COMMENT ÇA MARCHE</span>
          <h2>
            Une manche que vous pouvez
            <br />
            <em>auditer, pas seulement regarder.</em>
          </h2>
          <p>
            Le résultat de chaque manche est fixé avant même l'ouverture des mises — le serveur ne peut pas l'ajuster après avoir vu vos paris. La page de
            jeu affiche l'empreinte engagée, puis révèle la graine et le point de crash exacts une fois la manche terminée.
          </p>
          <div className="check-list">
            {checks.map((check) => (
              <div key={check}>
                <span>
                  <Check size={13} />
                </span>
                {check}
              </div>
            ))}
          </div>
          <a className="text-link" href="/game">
            Ouvrir le cockpit et vérifier une manche <ArrowRight size={15} />
          </a>
        </div>
      </section>
      <section className="seed-card">
        <div className="seed-icon">
          <KeyRound size={20} />
        </div>
        <div>
          <span className="eyebrow">FORMULE PUBLIQUE</span>
          <h3>Point de crash = f(HMAC-SHA256(graine, nonce))</h3>
          <p>
            Le point de crash est dérivé de l'empreinte HMAC en un nombre uniforme, puis transformé par la formule classique des jeux crash{" "}
            <code>(1 − marge) / (1 − u)</code>, plafonnée à un minimum de 1,01x. La marge (house edge) et le code de dérivation sont documentés dans le
            dépôt du projet.
          </p>
        </div>
      </section>
      <footer className="marketing-footer">
        <span>
          Chicken Crash <span className="muted-divider">•</span> Conçu pour un jeu responsable.
        </span>
        <a href="/">Retour à l'accueil</a>
      </footer>
    </main>
  );
}
