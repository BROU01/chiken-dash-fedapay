import { useState } from "react";
import { ArrowRight, BadgeCheck, BarChart3, Bird, Coins, LockKeyhole, Plane, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { withBase } from "@/lib/baseUrl";
import SiteHeader from "@/components/SiteHeader";

const REFERENCE_ART = "/manus-storage/chicken-dash-reference_60291c4b.png";
const MASCOT_ART = "/manus-storage/chicken-dash-mascot_1b5e0100.png";

export default function Landing() {
  const [mascotOk, setMascotOk] = useState(true);

  return (
    <main className="marketing-shell landing-page">
      <div className="noise-layer" aria-hidden="true" />
      <SiteHeader />
      <section className="landing-hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(8,10,20,.98) 0%, rgba(8,10,20,.86) 35%, rgba(8,10,20,.28) 73%, rgba(8,10,20,.72) 100%), url(${REFERENCE_ART})` }}>
        <div className="hero-copy">
          <div className="kicker"><span className="pulse-dot" /> UN NOUVEAU GENRE DE VOL</div>
          <h1>Lisez la courbe.<br /><span>Battez le crash.</span></h1>
          <p className="hero-lede">Chicken Crash est un jeu de multiplicateur à enjeu élevé, bâti autour d'une seule décision parfaite : savoir quand atterrir.</p>
          <div className="hero-actions"><a className="primary-button hero-cta" href={withBase("/game")}>Accéder au cockpit <ArrowRight size={18} /></a><a className="text-link" href={withBase("/how-to-play")}>Voir comment ça marche <ArrowRight size={15} /></a></div>
          <div className="hero-proof"><span><Coins size={15} /> Mises dès 100 F CFA</span><span><BadgeCheck size={15} /> Mode démo inclus</span><span><LockKeyhole size={15} /> Équité au cœur du concept</span></div>
        </div>
        <div className="hero-mascot"><div className="mascot-orbit orbit-one" /><div className="mascot-orbit orbit-two" />{mascotOk ? <img src={MASCOT_ART} alt="Chicken Crash pilot flying through the night" onError={() => setMascotOk(false)} /> : <span className="pilot-badge" aria-hidden="true"><Bird size={34} strokeWidth={2.2} /></span>}<div className="hero-multiplier"><span>APERÇU DU VOL EN DIRECT</span><strong>2,84<small>x</small></strong><em>encaissez au bon moment</em></div></div>
        <div className="hero-scroll"><span /> Faites défiler pour explorer</div>
      </section>
      <section className="landing-intro page-section">
        <div className="section-lead"><span className="eyebrow">LE PLAN DE VOL</span><h2>Des règles simples.<br /><em>Des réflexes affûtés.</em></h2></div>
        <div className="intro-copy"><p>Chaque manche démarre à 1,00x et grimpe jusqu'au crash. Le pilote automatique mise, suit la courbe, et encaisse avant la fin du vol.</p><a className="text-link" href={withBase("/how-to-play")}>Apprendre les commandes <ArrowRight size={15} /></a></div>
      </section>
      <section className="feature-grid page-section">
        <a className="feature-card" href={withBase("/how-to-play")}><span className="feature-icon"><Zap size={20} /></span><span className="eyebrow">01 / LA BOUCLE</span><h3>Une manche.<br />Une décision.</h3><p>Rapide à apprendre, impossible à ignorer. Votre timing écrit l'histoire.</p><span className="feature-link">Comment jouer <ArrowRight size={14} /></span></a>
        <a className="feature-card feature-card-gold" href={withBase("/fairness")}><span className="feature-icon"><ShieldCheck size={20} /></span><span className="eyebrow">02 / LA PROMESSE</span><h3>Faites confiance<br />au vol.</h3><p>Comprenez la graine, vérifiez le résultat et rendez chaque manche auditable.</p><span className="feature-link">Notre modèle d'équité <ArrowRight size={14} /></span></a>
        <a className="feature-card" href={withBase("/history")}><span className="feature-icon"><BarChart3 size={20} /></span><span className="eyebrow">03 / LE REGISTRE</span><h3>Voyez chaque<br />atterrissage.</h3><p>Rejouez les chiffres, étudiez vos sorties et trouvez votre propre rythme.</p><span className="feature-link">Voir l'historique des vols <ArrowRight size={14} /></span></a>
      </section>
      <section className="landing-final page-section"><div><span className="eyebrow"><Sparkles size={13} /> PRÊT QUAND VOUS L'ÊTES</span><h2>Votre meilleure sortie<br /><em>est encore devant vous.</em></h2></div><a className="primary-button" href={withBase("/game")}>Lancer Chicken Crash <Plane size={17} /></a></section>
      <footer className="marketing-footer"><span>Chicken Crash <span className="muted-divider">•</span> Contrôle de vol pour réflexes affûtés.</span><span><a href={withBase("/fairness")}>Équité</a><span className="muted-divider">•</span><a href={withBase("/how-to-play")}>Comment jouer</a></span></footer>
    </main>
  );
}
