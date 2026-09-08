import { ArrowRight, BadgeCheck, BarChart3, Coins, LockKeyhole, Plane, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { ChickenMascot } from "@/components/ChickenMascot";
import SiteHeader from "@/components/SiteHeader";

export default function Landing() {
  return (
    <main className="marketing-shell landing-page">
      <div className="noise-layer" aria-hidden="true" />
      <SiteHeader />
      <section className="landing-hero">
        <div className="hero-copy">
          <div className="kicker">
            <span className="pulse-dot" /> UN NOUVEAU GENRE DE VOL
          </div>
          <h1>
            Lisez la courbe.
            <br />
            <span>Battez le crash.</span>
          </h1>
          <p className="hero-lede">
            Chicken Crash est un jeu de multiplicateur à enjeu élevé : misez, regardez le multiplicateur grimper, et encaissez avant le crash.
          </p>
          <div className="hero-actions">
            <a className="primary-button hero-cta" href="/game">
              Accéder au cockpit <ArrowRight size={18} />
            </a>
            <a className="text-link" href="/how-to-play">
              Voir comment ça marche <ArrowRight size={15} />
            </a>
          </div>
          <div className="hero-proof">
            <span>
              <Coins size={15} /> Mises dès 100 F CFA
            </span>
            <span>
              <BadgeCheck size={15} /> Dépôt &amp; retrait Mobile Money
            </span>
            <span>
              <LockKeyhole size={15} /> Résultat vérifiable, manche par manche
            </span>
          </div>
        </div>
        <div className="hero-mascot">
          <div className="mascot-orbit orbit-one" />
          <div className="mascot-orbit orbit-two" />
          <ChickenMascot pose="flying" title="Pilote Chicken Crash" />
          <div className="hero-multiplier">
            <span>APERÇU DU VOL EN DIRECT</span>
            <strong>
              2,84<small>x</small>
            </strong>
            <em>encaissez au bon moment</em>
          </div>
        </div>
        <div className="hero-scroll">
          <span /> Faites défiler pour explorer
        </div>
      </section>
      <section className="landing-intro page-section">
        <div className="section-lead">
          <span className="eyebrow">LE PLAN DE VOL</span>
          <h2>
            Des règles simples.
            <br />
            <em>Des réflexes affûtés.</em>
          </h2>
        </div>
        <div className="intro-copy">
          <p>Chaque manche démarre à 1,00x et grimpe jusqu'au crash. Placez votre mise avant le décollage, et encaissez avant que le ciel ne vire au rouge.</p>
          <a className="text-link" href="/how-to-play">
            Apprendre les commandes <ArrowRight size={15} />
          </a>
        </div>
      </section>
      <section className="feature-grid page-section">
        <a className="feature-card" href="/how-to-play">
          <span className="feature-icon">
            <Zap size={20} />
          </span>
          <span className="eyebrow">01 / LA BOUCLE</span>
          <h3>
            Une manche.
            <br />
            Une décision.
          </h3>
          <p>Rapide à apprendre, impossible à ignorer. Votre timing écrit l'histoire.</p>
          <span className="feature-link">
            Comment jouer <ArrowRight size={14} />
          </span>
        </a>
        <a className="feature-card feature-card-gold" href="/fairness">
          <span className="feature-icon">
            <ShieldCheck size={20} />
          </span>
          <span className="eyebrow">02 / LA PROMESSE</span>
          <h3>
            Faites confiance
            <br />
            au vol.
          </h3>
          <p>Une graine serveur engagée avant chaque manche, révélée après le crash — vérifiable de façon indépendante.</p>
          <span className="feature-link">
            Notre modèle d'équité <ArrowRight size={14} />
          </span>
        </a>
        <a className="feature-card" href="/history">
          <span className="feature-icon">
            <BarChart3 size={20} />
          </span>
          <span className="eyebrow">03 / LE REGISTRE</span>
          <h3>
            Voyez chaque
            <br />
            atterrissage.
          </h3>
          <p>Rejouez les chiffres, étudiez vos sorties et trouvez votre propre rythme.</p>
          <span className="feature-link">
            Voir l'historique des vols <ArrowRight size={14} />
          </span>
        </a>
      </section>
      <section className="landing-final page-section">
        <div>
          <span className="eyebrow">
            <Sparkles size={13} /> PRÊT QUAND VOUS L'ÊTES
          </span>
          <h2>
            Votre meilleure sortie
            <br />
            <em>est encore devant vous.</em>
          </h2>
        </div>
        <a className="primary-button" href="/game">
          Lancer Chicken Crash <Plane size={17} />
        </a>
      </section>
      <footer className="marketing-footer">
        <span>
          Chicken Crash <span className="muted-divider">•</span> Jeu réservé aux adultes (18+). Jouez avec modération.
        </span>
        <span>
          <a href="/fairness">Équité</a>
          <span className="muted-divider">•</span>
          <a href="/how-to-play">Comment jouer</a>
        </span>
      </footer>
    </main>
  );
}
