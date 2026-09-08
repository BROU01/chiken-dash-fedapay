import { useMemo, useState } from "react";
import { ArrowUpRight, BadgeCheck, Copy, History, Lock, ShieldCheck, Sparkles, TrendingUp, Wallet, X } from "lucide-react";
import { ChickenMascot } from "@/components/ChickenMascot";
import SiteHeader from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { type RoundView, useGameState } from "@/hooks/useGameState";
import { api, ApiError } from "@/lib/api";

const numberFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const xFormatter = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function formatMoney(value: number) {
  return `${numberFormatter.format(Math.round(value))} FCFA`;
}
function formatX(value: number) {
  return `${xFormatter.format(value)}x`;
}

const ERROR_MESSAGES: Record<string, string> = {
  INSUFFICIENT_FUNDS: "Solde insuffisant — déposez des fonds dans votre portefeuille.",
  BETTING_CLOSED: "Les mises sont closes pour cette manche, patientez pour la suivante.",
  ALREADY_BET: "Vous avez déjà misé sur cette manche.",
  CANNOT_CASH_OUT: "Impossible d'encaisser à cet instant.",
  NO_ACTIVE_BET: "Aucune mise active à encaisser.",
  INVALID_STAKE: "Montant de mise invalide.",
  INVALID_AUTO_TARGET: "Cible d'encaissement automatique invalide.",
  AUTH_REQUIRED: "Connectez-vous pour jouer.",
};

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return ERROR_MESSAGES[error.code] ?? "Une erreur est survenue.";
  return "Une erreur est survenue.";
}

function generateCurve(multiplier: number, status: RoundView["status"]) {
  const progress = Math.min(1, Math.max(0.16, (multiplier - 1) / 8.5));
  const points = Array.from({ length: 30 }, (_, index) => {
    const x = index * (100 / 29);
    const local = index / 29;
    const y = 90 - Math.pow(local, 1.5) * (68 + progress * 16) - Math.sin(local * 4.4) * 1.6;
    return `${x.toFixed(2)},${Math.max(9, y).toFixed(2)}`;
  });
  const visibleCount = status === "betting" ? 11 : Math.max(12, Math.round(11 + progress * 19));
  const visible = points.slice(0, visibleCount);
  const last = visible[visible.length - 1].split(",");
  const path = `M ${visible.join(" L ")}`;
  const fillPath = `${path} L ${last[0]},100 L 0,100 Z`;
  return { path, fillPath, lastX: Number(last[0]), lastY: Number(last[1]) };
}

function statusCopy(status: RoundView["status"]) {
  if (status === "live") return { label: "EN VOL", detail: "Le multiplicateur grimpe. Encaissez avant le crash.", tone: "live" };
  if (status === "crashed") return { label: "CRASH", detail: "La manche a percuté les nuages. Le prochain vol embarque bientôt.", tone: "crashed" };
  return { label: "EMBARQUEMENT", detail: "Placez votre mise avant le décollage.", tone: "idle" };
}

export default function Home() {
  const { user, balance, loading, refresh } = useAuth();
  const { state, connected, refreshNow } = useGameState(!loading && !!user);
  const [stake, setStake] = useState(500);
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [autoTarget, setAutoTarget] = useState(2);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("Placez votre mise avant le prochain décollage.");
  const [showFairness, setShowFairness] = useState(false);

  const status = statusCopy(state?.status ?? "betting");
  const multiplier = state?.multiplier ?? 1;
  const curve = useMemo(() => generateCurve(multiplier, state?.status ?? "betting"), [multiplier, state?.status]);
  const roundId = state ? `#${String(state.roundId).padStart(5, "0")}` : "#—";
  const yourBet = state?.yourBet ?? null;
  const displayLost = state?.status === "crashed" && yourBet?.status === "placed";

  async function handleBet() {
    setBusy(true);
    try {
      await api.post("/game/bet", { stake, autoCashoutTarget: autoEnabled ? autoTarget : null });
      await refreshNow();
      await refresh();
      setNotice(`Mise de ${formatMoney(stake)} placée. Décollage imminent.`);
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleCashOut() {
    setBusy(true);
    try {
      const view = await api.post<RoundView>("/game/cashout");
      await refreshNow();
      await refresh();
      const payout = view.yourBet?.payout ?? 0;
      setNotice(`Encaissé à ${formatX(view.yourBet?.cashoutMultiplier ?? 1)} : +${formatMoney(payout)}.`);
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const copyFairness = async () => {
    if (!state) return;
    const text =
      state.status === "crashed"
        ? `Graine: ${state.serverSeed} | Nonce: ${state.nonce} | Crash: ${state.crashPoint}x | Empreinte: ${state.serverSeedHash}`
        : `Empreinte engagée (avant révélation): ${state.serverSeedHash} | Nonce: ${state.nonce}`;
    try {
      await navigator.clipboard?.writeText(text);
      setNotice("Données d'équité copiées dans le presse-papiers.");
    } catch {
      setNotice("Impossible de copier — copiez manuellement depuis la fenêtre d'équité.");
    }
  };

  if (!loading && !user) {
    return (
      <main className="app-shell">
        <div className="noise-layer" aria-hidden="true" />
        <SiteHeader active="/game" />
        <section className="page-content">
          <div className="callout-panel" style={{ margin: "60px auto" }}>
            <div>
              <span className="eyebrow">
                <Lock size={13} /> CONNEXION REQUISE
              </span>
              <h2>Créez un compte pour piloter.</h2>
            </div>
            <p>Chicken Crash mise du vrai argent (F CFA via Mobile Money). Connectez-vous ou créez un compte pour accéder au cockpit.</p>
            <a className="primary-button" href="/register">
              Créer un compte <ArrowUpRight size={17} />
            </a>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <div className="noise-layer" aria-hidden="true" />
      <SiteHeader active="/game" />

      <section className="page-content" id="top">
        <div className="page-intro">
          <div>
            <div className="kicker">
              <span className="pulse-dot" /> CONTRÔLE DE VOL / MANCHE {state ? String(state.roundId).padStart(5, "0") : "—"}
            </div>
            <h1>
              Jusqu'où allez-vous <span>monter ?</span>
            </h1>
            <p>Lisez la courbe. Faites confiance à vos nerfs. Encaissez avant que le ciel ne vire au rouge.</p>
          </div>
          <div className="wallet-card" aria-label="Solde du portefeuille">
            <div className="wallet-topline">
              <span className="eyebrow">
                <Wallet size={13} /> solde du portefeuille
              </span>
              <span className="wallet-mode">{connected ? "EN DIRECT" : "RECONNEXION…"}</span>
            </div>
            <strong>{formatMoney(balance)}</strong>
            <a className="text-link" href="/wallet" style={{ marginTop: 8 }}>
              Déposer / retirer <ArrowUpRight size={13} />
            </a>
          </div>
        </div>

        <div className="layout-grid" id="flight">
          <section className={`flight-panel ${status.tone}`} aria-label="Jeu crash en direct">
            <div className="flight-panel-top">
              <div className="live-label">
                <span className="live-signal" /> VOL EN DIRECT <span className="muted-divider">/</span> <span className="round-id">{roundId}</span>
              </div>
              <span className={`badge badge-${status.tone === "crashed" ? "coral" : status.tone === "live" ? "live" : "neutral"}`}>{status.label}</span>
            </div>
            <div className="chart-wrap">
              <div className="chart-glow" aria-hidden="true" />
              <div className="chart-gridlines" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className="axis-label axis-y top">8x</div>
              <div className="axis-label axis-y mid">4x</div>
              <div className="axis-label axis-y bottom">1x</div>
              <svg
                className="flight-chart"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                role="img"
                aria-label={`Courbe du multiplicateur, actuellement à ${xFormatter.format(multiplier)} fois`}
              >
                <defs>
                  <linearGradient id="curveStroke" x1="0" y1="1" x2="1" y2="0">
                    <stop offset="0%" stopColor="#f6b73c" />
                    <stop offset="70%" stopColor="#ffcf67" />
                    <stop offset="100%" stopColor={status.tone === "crashed" ? "#e76658" : "#fff0bf"} />
                  </linearGradient>
                  <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f6b73c" stopOpacity=".22" />
                    <stop offset="100%" stopColor="#f6b73c" stopOpacity="0" />
                  </linearGradient>
                  <filter id="curveBlur">
                    <feGaussianBlur stdDeviation="1.7" />
                  </filter>
                </defs>
                <path d={curve.fillPath} fill="url(#curveFill)" />
                <path d={curve.path} fill="none" stroke="#f6b73c" strokeOpacity=".28" strokeWidth="5" filter="url(#curveBlur)" vectorEffect="non-scaling-stroke" />
                <path d={curve.path} fill="none" stroke="url(#curveStroke)" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
              </svg>
              <div className="pilot-marker" style={{ left: `${curve.lastX}%`, top: `${curve.lastY}%` }}>
                <div className="pilot-ring" />
                <ChickenMascot pose={status.tone === "crashed" ? "crashed" : "flying"} title="Pilote Chicken Crash" />
              </div>
              <div className="multiplier-readout">
                <span className="readout-label">MULTIPLICATEUR ACTUEL</span>
                <strong className={status.tone === "crashed" ? "crashed-number" : ""}>
                  {xFormatter.format(multiplier)}
                  <small>x</small>
                </strong>
                <span className="readout-sub">{status.detail}</span>
              </div>
            </div>
            <div className="flight-status-row">
              <div className="status-message">
                <span className={`status-icon ${status.tone}`}>
                  <TrendingUp size={15} />
                </span>
                <span>{notice}</span>
              </div>
              <div className="fairness-inline">
                <BadgeCheck size={15} /> <span>{state?.serverSeedHash ? `${state.serverSeedHash.slice(0, 10)}…` : "en attente"}</span>
              </div>
            </div>
          </section>

          <aside className="control-column" aria-label="Mise et encaissement">
            <div className="control-card bet-card">
              <div className="card-heading">
                <div>
                  <span className="eyebrow">votre mise</span>
                  <h2>Cockpit</h2>
                </div>
              </div>

              {!yourBet ? (
                <>
                  <div className="stake-input-wrap">
                    <span className="currency">F</span>
                    <input
                      aria-label="Montant de la mise"
                      type="number"
                      min="100"
                      step="100"
                      max={balance}
                      value={stake}
                      onChange={(event) => setStake(Number(event.target.value))}
                      disabled={state?.status !== "betting" || busy}
                    />
                    <span className="currency-label">CFA</span>
                  </div>
                  <div className="quick-row">
                    {[100, 500, 1000, 2500].map((value) => (
                      <button key={value} className={stake === value ? "quick selected" : "quick"} type="button" onClick={() => setStake(value)}>
                        {value}
                      </button>
                    ))}
                    <button className="quick" type="button" onClick={() => setStake(Math.max(100, Math.floor(balance / 2)))}>
                      ½
                    </button>
                  </div>
                  <div className="auto-cashout-row" style={{ marginTop: 12 }}>
                    <label className="auto-cashout-copy">
                      <input type="checkbox" checked={autoEnabled} onChange={(event) => setAutoEnabled(event.target.checked)} />
                      <span>
                        <strong>Encaissement automatique</strong>
                        <small>Encaisse seul à la cible choisie</small>
                      </span>
                    </label>
                    <div className="auto-target-wrap">
                      <div>
                        <input
                          type="number"
                          min="1.01"
                          max="1000"
                          step="0.01"
                          value={autoTarget}
                          disabled={!autoEnabled}
                          onChange={(event) => setAutoTarget(Number(event.target.value))}
                        />
                        <span>x</span>
                      </div>
                    </div>
                  </div>
                  <button className="primary-button" type="button" disabled={state?.status !== "betting" || busy} onClick={handleBet}>
                    <span>Miser {formatMoney(stake)}</span>
                  </button>
                </>
              ) : (
                <div className="cashout-card" style={{ marginTop: 20 }}>
                  <div className="cashout-value">
                    <span>Mise engagée</span>
                    <strong>{formatMoney(yourBet.stake)}</strong>
                  </div>
                  {yourBet.status === "placed" && !displayLost && (
                    <button className="cashout-button" type="button" disabled={state?.status !== "live" || busy} onClick={handleCashOut}>
                      Encaisser {formatX(multiplier)} — {formatMoney(Math.floor(yourBet.stake * multiplier))}
                    </button>
                  )}
                  {(yourBet.status === "cashed") && (
                    <p className="safe-copy">
                      <ShieldCheck size={13} /> Encaissé à {formatX(yourBet.cashoutMultiplier ?? 1)} : +{formatMoney(yourBet.payout ?? 0)}
                    </p>
                  )}
                  {(yourBet.status === "lost" || displayLost) && (
                    <p className="safe-copy">Perdu — la mise n'a pas été encaissée à temps.</p>
                  )}
                  {yourBet.status === "placed" && state?.status === "betting" && <p className="safe-copy">Mise en attente du décollage…</p>}
                </div>
              )}
              <p className="safe-copy">
                <ShieldCheck size={13} /> Jeu réel — 18 ans et plus. Ne misez que ce que vous pouvez perdre.
              </p>
            </div>

            <button className="fairness-card" type="button" onClick={() => setShowFairness(true)} id="fairness">
              <span className="fairness-icon">
                <ShieldCheck size={17} />
              </span>
              <span className="fairness-copy">
                <strong>Équité vérifiable</strong>
                <small>Graine engagée, révélée après le crash</small>
              </span>
              <ArrowUpRight size={16} />
            </button>
          </aside>
        </div>

        <div className="below-grid" id="history">
          <section className="history-card">
            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  <History size={13} /> journal de vol
                </span>
                <h2>Manches récentes</h2>
              </div>
            </div>
            <div className="rounds-list">
              {(state?.recentCrashes ?? []).map((value, index) => (
                <div className="round-chip" key={`${value}-${index}`}>
                  <span className={`round-dot ${value < 2 ? "coral" : ""}`} />
                  {formatX(value)}
                </div>
              ))}
              {(!state || state.recentCrashes.length === 0) && <span className="stat-detail">Pas encore de manche terminée.</span>}
            </div>
            <div className="history-caption">
              <span className="pulse-dot tiny" /> Chaque résultat est vérifiable — voir « Équité vérifiable »
            </div>
          </section>

          <section className="feed-card">
            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  <ShieldCheck size={13} /> jeu responsable
                </span>
                <h2>Vos garde-fous</h2>
              </div>
            </div>
            <div className="feed-list">
              <p className="stat-detail" style={{ padding: "10px 0" }}>
                Définissez une limite de dépôt et des pauses régulières depuis votre <a className="text-link" href="/wallet">portefeuille</a>. Le jeu
                d'argent comporte des risques : jouez pour le plaisir, jamais pour vous refaire.
              </p>
            </div>
          </section>

          <section className="stat-strip">
            <div className="stat-card stat-gold">
              <span className="eyebrow">Dernier crash</span>
              <strong>{state?.recentCrashes[0] ? formatX(state.recentCrashes[0]) : "—"}</strong>
              <span className="stat-detail">manche précédente</span>
            </div>
            <div className="stat-card">
              <span className="eyebrow">Mise minimum</span>
              <strong>100 FCFA</strong>
              <span className="stat-detail">par manche</span>
            </div>
          </section>
        </div>

        <footer className="footer-note">
          <span>
            <Sparkles size={13} /> Conçu pour le frisson de l'ascension.
          </span>
          <span>
            Chicken Crash <span className="muted-divider">•</span>{" "}
            <button type="button" onClick={() => setShowFairness(true)}>
              Équité &amp; sécurité
            </button>
          </span>
        </footer>
      </section>

      {showFairness && (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowFairness(false)}>
          <section className="fairness-modal" role="dialog" aria-modal="true" aria-labelledby="fair-title" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" aria-label="Fermer" onClick={() => setShowFairness(false)}>
              <X size={18} />
            </button>
            <div className="modal-icon">
              <ShieldCheck size={23} />
            </div>
            <span className="eyebrow">faites confiance au vol</span>
            <h2 id="fair-title">Manche {roundId} — équité vérifiable</h2>
            <p>
              {state?.status === "crashed"
                ? `Graine serveur révélée : point de crash ${formatX(Number(state.crashPoint))}. Recalculez sha256(graine) pour vérifier l'empreinte, et HMAC-SHA256(graine, ${state.nonce}) pour vérifier le point de crash.`
                : "La graine serveur reste secrète jusqu'à la fin de la manche — seule son empreinte SHA-256 est publiée maintenant, pour prouver qu'elle ne changera pas."}
            </p>
            <div className="hash-box">
              <span>EMPREINTE ENGAGÉE</span>
              <code>{state?.serverSeedHash ?? "—"}</code>
              <button type="button" onClick={copyFairness} aria-label="Copier les données d'équité">
                <Copy size={14} />
              </button>
            </div>
            {state?.status === "crashed" && (
              <div className="hash-box">
                <span>GRAINE RÉVÉLÉE</span>
                <code>{state.serverSeed}</code>
              </div>
            )}
            <div className="modal-actions">
              <button className="secondary-button" type="button" onClick={() => setShowFairness(false)}>
                Compris
              </button>
              <button className="primary-button compact" type="button" onClick={copyFairness}>
                Copier <Copy size={15} />
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
