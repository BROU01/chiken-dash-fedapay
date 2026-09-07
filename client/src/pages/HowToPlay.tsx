import { ArrowRight, CircleDollarSign, MousePointerClick, Plane, ShieldCheck, TimerReset } from "lucide-react";
import { withBase } from "@/lib/baseUrl";
import SiteHeader from "@/components/SiteHeader";

const steps = [
  { number: "01", icon: CircleDollarSign, title: "Fixez la mise du pilote", copy: "Réglez la mise du pilote automatique avant le décollage. Commencez en mode démo pour apprendre le rythme sans risque financier." },
  { number: "02", icon: TimerReset, title: "Suivez l'ascension", copy: "Le multiplicateur grimpe à partir de 1,00x. Plus vous restez en vol, plus vous pouvez gagner — et plus vous pouvez perdre." },
  { number: "03", icon: MousePointerClick, title: "Le pilote encaisse", copy: "Le pilote automatique suit la courbe et encaisse à sa cible, tirée au hasard jusqu'à 20x. Le gain est verrouillé à l'instant où il atterrit." },
];

export default function HowToPlay() {
  return <main className="marketing-shell info-page"><div className="noise-layer" aria-hidden="true" /><SiteHeader active="/how-to-play" /><section className="info-hero"><span className="kicker"><Plane size={14} /> ÉCOLE DE VOL</span><h1>Trois gestes.<br /><em>Un atterrissage net.</em></h1><p>Chicken Crash se comprend en quelques secondes et se maîtrise avec le temps.</p></section><section className="steps-grid">{steps.map(({ number, icon: Icon, title, copy }) => <article className="step-card" key={number}><span className="step-number">{number}</span><span className="step-icon"><Icon size={21} /></span><h2>{title}</h2><p>{copy}</p></article>)}</section><section className="callout-panel"><div><span className="eyebrow"><ShieldCheck size={13} /> PILOTE AUTOMATIQUE</span><h2>Un pilote auto<br /><em>aux nerfs d'acier.</em></h2></div><p>Le pilote auto mise et encaisse seul, avec une cible tirée au hasard jusqu'à 20x. En démo, les vols plafonnent à 7x ; en mode réel, chaque vol s'écrase au décollage.</p><a className="primary-button" href={withBase("/game")}>Voir le pilote en action <ArrowRight size={17} /></a></section><footer className="marketing-footer"><span>Chicken Crash <span className="muted-divider">•</span> Le cockpit vous attend.</span><a href={withBase("/")}>Retour à l'accueil</a></footer></main>;
}
