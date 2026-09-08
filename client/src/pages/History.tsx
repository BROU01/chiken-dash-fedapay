import { ArrowRight, BarChart3, Clock3, History as HistoryIcon, Plane, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";

interface BetRow {
  id: string;
  stake: string;
  status: "placed" | "cashed" | "lost";
  cashout_multiplier: string | null;
  payout: string | null;
  crash_point: string;
  created_at: string;
}

const xFormatter = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function History() {
  const { user } = useAuth();
  const [bets, setBets] = useState<BetRow[] | null>(null);

  useEffect(() => {
    if (!user) return;
    api.get<{ bets: BetRow[] }>("/game/history").then((data) => setBets(data.bets));
  }, [user]);

  const wins = bets?.filter((bet) => bet.status === "cashed").length ?? 0;
  const successRate = bets && bets.length > 0 ? ((wins / bets.length) * 100).toFixed(1) : "—";
  const best = bets && bets.length > 0 ? Math.max(...bets.map((bet) => Number(bet.cashout_multiplier ?? 0))) : 0;

  return (
    <main className="marketing-shell info-page history-page">
      <div className="noise-layer" aria-hidden="true" />
      <SiteHeader active="/history" />
      <section className="info-hero history-heading">
        <div>
          <span className="kicker">
            <HistoryIcon size={14} /> LE JOURNAL DE VOL
          </span>
          <h1>
            Chaque sortie
            <br />
            <em>laisse une trace.</em>
          </h1>
          <p>Utilisez l'historique pour comprendre votre rythme — pas pour courir après la dernière manche.</p>
        </div>
        <a className="primary-button" href="/game">
          Nouveau vol <Plane size={16} />
        </a>
      </section>

      {!user ? (
        <section className="callout-panel">
          <div>
            <span className="eyebrow">CONNEXION REQUISE</span>
            <h2>Connectez-vous pour voir votre historique.</h2>
          </div>
          <p>Votre journal de vol est personnel — il montre vos propres mises et sorties, pas celles des autres joueurs.</p>
          <a className="primary-button" href="/login">
            Se connecter <ArrowRight size={17} />
          </a>
        </section>
      ) : (
        <section className="history-overview">
          <div className="history-main">
            <div className="section-heading">
              <div>
                <span className="eyebrow">MANCHES RÉCENTES</span>
                <h2>Vos dernières mises</h2>
              </div>
              <span className="history-status">
                <span className="pulse-dot tiny" /> Données réelles de votre compte
              </span>
            </div>
            <div className="history-grid">
              {(bets ?? []).map((bet) => (
                <div className={`history-value ${bet.status === "lost" ? "danger" : ""}`} key={bet.id}>
                  <span className="round-index">{new Date(bet.created_at).toLocaleTimeString("fr-FR")}</span>
                  <strong>{bet.status === "lost" ? xFormatter.format(Number(bet.crash_point)) + "x" : xFormatter.format(Number(bet.cashout_multiplier)) + "x"}</strong>
                  <small>{bet.status === "cashed" ? `+${bet.payout} FCFA` : bet.status === "lost" ? `−${bet.stake} FCFA` : "en cours"}</small>
                </div>
              ))}
              {bets && bets.length === 0 && <p className="stat-detail">Aucune manche jouée pour le moment.</p>}
            </div>
          </div>
          <aside className="history-stats">
            <div className="record-stat">
              <span className="eyebrow">
                <TrendingUp size={13} /> MEILLEUR ENCAISSEMENT
              </span>
              <strong>{best > 0 ? `${xFormatter.format(best)}x` : "—"}</strong>
              <small>sur vos manches gagnées</small>
            </div>
            <div className="record-stat green">
              <span className="eyebrow">
                <BarChart3 size={13} /> TAUX DE RÉUSSITE
              </span>
              <strong>{successRate}%</strong>
              <small>{bets?.length ?? 0} dernières manches</small>
            </div>
            <div className="record-stat">
              <span className="eyebrow">
                <Clock3 size={13} /> MANCHES JOUÉES
              </span>
              <strong>{bets?.length ?? 0}</strong>
              <small>historique récent</small>
            </div>
          </aside>
        </section>
      )}

      <section className="history-note">
        <span>
          <HistoryIcon size={17} />
        </span>
        <p>L'historique éclaire, il ne garantit rien. Chaque nouvelle manche repart d'un vol vierge.</p>
        <a className="text-link" href="/how-to-play">
          Revoir les règles <ArrowRight size={14} />
        </a>
      </section>
      <footer className="marketing-footer">
        <span>
          Chicken Crash <span className="muted-divider">•</span> Étudiez l'ascension.
        </span>
        <a href="/">Retour à l'accueil</a>
      </footer>
    </main>
  );
}
