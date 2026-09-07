import { ArrowUpRight, Menu, Plane, ShieldCheck, X } from "lucide-react";
import { useState } from "react";

const links = [
  { href: "/how-to-play", label: "Comment jouer" },
  { href: "/fairness", label: "Équité vérifiable" },
  { href: "/history", label: "Historique des vols" },
];

export default function SiteHeader({ active = "" }: { active?: string }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="topbar site-header">
      <a className="brand" href="/" aria-label="Accueil Chicken Crash">
        <span className="brand-mark"><Plane size={18} strokeWidth={2.4} /></span>
        <span><strong>CHICKEN</strong><em>CRASH</em></span>
      </a>
      <nav className={`topnav ${menuOpen ? "open" : ""}`} aria-label="Navigation principale">
        {links.map((link) => <a key={link.href} className={active === link.href ? "active" : ""} href={link.href} onClick={() => setMenuOpen(false)}>{link.label}</a>)}
      </nav>
      <div className="top-actions">
        <button className="icon-button mobile-only" type="button" aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"} onClick={() => setMenuOpen((value) => !value)}>
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <a className="fair-button" href="/fairness"><ShieldCheck size={16} /> <span>Équité vérifiable</span></a>
        <a className="header-cta" href="/game">Jouer <ArrowUpRight size={14} /></a>
      </div>
    </header>
  );
}
