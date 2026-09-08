import { ArrowRight } from "lucide-react";
import { ChickenMascot } from "@/components/ChickenMascot";
import SiteHeader from "@/components/SiteHeader";

export default function NotFound() {
  return (
    <main className="marketing-shell info-page">
      <div className="noise-layer" aria-hidden="true" />
      <SiteHeader />
      <section className="info-hero" style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ width: 140 }}>
          <ChickenMascot pose="crashed" title="Le pilote s'est perdu" />
        </div>
        <h1 style={{ marginTop: 24 }}>
          Vol introuvable.
          <br />
          <em>404</em>
        </h1>
        <p>Cette piste n'existe pas, ou plus. Revenez au cockpit.</p>
        <a className="primary-button" href="/" style={{ width: "auto", marginTop: 24, padding: "0 20px" }}>
          Retour à l'accueil <ArrowRight size={17} />
        </a>
      </section>
    </main>
  );
}
