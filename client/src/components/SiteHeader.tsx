import { ArrowUpRight, LogOut, Menu, ShieldCheck, Wallet as WalletIcon, X } from "lucide-react";
import { useState } from "react";
import { ChickenMark } from "@/components/ChickenMascot";
import { useAuth } from "@/hooks/useAuth";

const links = [
  { href: "/how-to-play", label: "Comment jouer" },
  { href: "/fairness", label: "Équité vérifiable" },
  { href: "/history", label: "Historique des vols" },
];

const numberFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

export default function SiteHeader({ active = "" }: { active?: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, balance, logout } = useAuth();

  return (
    <header className="topbar site-header">
      <a className="brand" href="/" aria-label="Accueil Chicken Crash">
        <span className="brand-mark">
          <ChickenMark />
        </span>
        <span>
          <strong>CHICKEN</strong>
          <em>CRASH</em>
        </span>
      </a>
      <nav className={`topnav ${menuOpen ? "open" : ""}`} aria-label="Navigation principale">
        {links.map((link) => (
          <a key={link.href} className={active === link.href ? "active" : ""} href={link.href} onClick={() => setMenuOpen(false)}>
            {link.label}
          </a>
        ))}
      </nav>
      <div className="top-actions">
        <button
          className="icon-button mobile-only"
          type="button"
          aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          onClick={() => setMenuOpen((value) => !value)}
        >
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <a className="fair-button" href="/fairness">
          <ShieldCheck size={16} /> <span>Équité vérifiable</span>
        </a>
        {user ? (
          <>
            <a className="user-pill" href="/wallet">
              <WalletIcon size={13} /> <span>{numberFormatter.format(balance)} FCFA</span>
            </a>
            <a className="header-cta" href="/game">
              Jouer <ArrowUpRight size={14} />
            </a>
            <button className="icon-button" type="button" aria-label="Se déconnecter" onClick={() => logout()}>
              <LogOut size={16} />
            </button>
          </>
        ) : (
          <>
            <a className="fair-button" href="/login">
              Connexion
            </a>
            <a className="header-cta" href="/register">
              Créer un compte <ArrowUpRight size={14} />
            </a>
          </>
        )}
      </div>
    </header>
  );
}
