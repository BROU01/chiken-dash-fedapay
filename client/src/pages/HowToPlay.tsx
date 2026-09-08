import { ArrowRight, CircleDollarSign, MousePointerClick, Plane, ShieldCheck, TimerReset } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";

const steps = [
  { number: "01", icon: CircleDollarSign, title: "Placez votre mise", copy: "Choisissez votre mise pendant la fenêtre de pari (quelques secondes avant chaque décollage). Optionnel : réglez un encaissement automatique à un multiplicateur cible." },
  { number: "02", icon: TimerReset, title: "Suivez l'ascension", copy: "Le multiplicateur grimpe à partir de 1,00x. Plus vous restez en vol, plus vous pouvez gagner — et plus vous pouvez tout perdre." },
  { number: "03", icon: MousePointerClick, title: "Encaissez à temps", copy: "Cliquez sur Encaisser avant le crash pour verrouiller votre gain au multiplicateur affiché à cet instant. Trop tard, et la mise est perdue." },
];

export default function HowToPlay() {
  return (
    <main className="marketing-shell info-page">
      <div className="noise-layer" aria-hidden="true" />
      <SiteHeader active="/how-to-play" />
      <section className="info-hero">
        <span className="kicker">
          <Plane size={14} /> ÉCOLE DE VOL
        </span>
        <h1>
          Trois gestes.
          <br />
          <em>Un atterrissage net.</em>
        </h1>
        <p>Chicken Crash se comprend en quelques secondes et se maîtrise avec le temps.</p>
      </section>
      <section className="steps-grid">
        {steps.map(({ number, icon: Icon, title, copy }) => (
          <article className="step-card" key={number}>
            <span className="step-number">{number}</span>
            <span className="step-icon">
              <Icon size={21} />
            </span>
            <h2>{title}</h2>
            <p>{copy}</p>
          </article>
        ))}
      </section>
      <section className="callout-panel">
        <div>
          <span className="eyebrow">
            <ShieldCheck size={13} /> JEU RESPONSABLE
          </span>
          <h2>
            Réservé aux adultes.
            <br />
            <em>Jouez avec une limite.</em>
          </h2>
        </div>
        <p>
          Chicken Crash est réservé aux personnes majeures (18+). Ne misez que ce que vous pouvez vous permettre de perdre : définissez une limite de dépôt
          dans votre portefeuille et faites une pause si le jeu cesse d'être un plaisir.
        </p>
        <a className="primary-button" href="/game">
          Voir le cockpit <ArrowRight size={17} />
        </a>
      </section>
      <footer className="marketing-footer">
        <span>
          Chicken Crash <span className="muted-divider">•</span> Le cockpit vous attend.
        </span>
        <a href="/">Retour à l'accueil</a>
      </footer>
    </main>
  );
}
