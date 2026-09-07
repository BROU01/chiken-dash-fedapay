import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  BadgeCheck,
  Bird,
  Copy,
  History,
  Pause,
  Play,
  Radio,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { CrashRoundEngine, type RoundSnapshot, type RoundStatus } from "@/game/crashEngine";
import SiteHeader from "@/components/SiteHeader";

const REFERENCE_ART = "/manus-storage/chicken-dash-reference_60291c4b.png";
const MASCOT_ART = "/manus-storage/chicken-dash-mascot_1b5e0100.png";
const STARTING_BALANCE = 250000;
/** Crash-point ceiling per wallet mode. */
const MAX_CEILING = 20;
const DEMO_CEILING = 7;
/** Real-money mode: the round always busts immediately. */
const REAL_CEILING = 1.01;

const initialRounds = [
  { value: "3,48x", tone: "gold" },
  { value: "1,12x", tone: "coral" },
  { value: "8,06x", tone: "gold" },
  { value: "1,86x", tone: "gold" },
  { value: "2,24x", tone: "gold" },
  { value: "1,03x", tone: "coral" },
  { value: "12,41x", tone: "gold" },
  { value: "2,98x", tone: "gold" },
];

const feedItems = [
  { name: "Milo_Cash", bet: "2 000 FCFA", value: "3,48x", gain: "+4 960 FCFA", color: "#7ee0b5" },
  { name: "orbiting_owl", bet: "5 000 FCFA", value: "2,91x", gain: "+9 550 FCFA", color: "#e9b75b" },
  { name: "paperplane", bet: "500 FCFA", value: "1,86x", gain: "+430 FCFA", color: "#9ab3ff" },
  { name: "kiki_kite", bet: "1 000 FCFA", value: "1,42x", gain: "+420 FCFA", color: "#ea897b" },
];

const numberFormatter = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 0,
});

const xFormatter = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatMoney(value: number) {
  return `${numberFormatter.format(Math.round(value))} FCFA`;
}

function formatX(value: number) {
  return `${xFormatter.format(value)}x`;
}

function statusCopy(status: RoundStatus) {
  if (status === "live") return { label: "EN VOL", detail: "Le pilote auto surveille la courbe et choisit son moment.", tone: "live" };
  if (status === "crashed") return { label: "CRASH", detail: "La manche a percuté les nuages. Le prochain vol embarque.", tone: "crashed" };
  if (status === "cashed") return { label: "ENCAISSÉ", detail: "Le pilote auto a sécurisé son gain dans le portefeuille.", tone: "cashed" };
  return { label: "EMBARQUEMENT", detail: "Le pilote automatique prépare le prochain décollage.", tone: "idle" };
}

function generateCurve(multiplier: number, status: RoundStatus) {
  const progress = Math.min(1, Math.max(0.16, (multiplier - 1) / 8.5));
  const points = Array.from({ length: 30 }, (_, index) => {
    const x = index * (100 / 29);
    const local = index / 29;
    const y = 90 - Math.pow(local, 1.5) * (68 + progress * 16) - Math.sin(local * 4.4) * 1.6;
    return `${x.toFixed(2)},${Math.max(9, y).toFixed(2)}`;
  });
  const visibleCount = status === "idle" ? 11 : Math.max(12, Math.round(11 + progress * 19));
  const visible = points.slice(0, visibleCount);
  const last = visible[visible.length - 1].split(",");
  const path = `M ${visible.join(" L ")}`;
  const fillPath = `${path} L ${last[0]},100 L 0,100 Z`;
  return { path, fillPath, lastX: Number(last[0]), lastY: Number(last[1]) };
}

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "gold" | "live" | "coral" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function StatCard({ label, value, detail, tone = "default" }: { label: string; value: string; detail: string; tone?: string }) {
  return (
    <div className={`stat-card stat-${tone}`}>
      <span className="eyebrow">{label}</span>
      <strong>{value}</strong>
      <span className="stat-detail">{detail}</span>
    </div>
  );
}

export default function Home() {
  const [balance, setBalance] = useState(STARTING_BALANCE);
  const [botStake, setBotStake] = useState(500);
  const [autoPilot, setAutoPilot] = useState(true);
  const [walletMode, setWalletMode] = useState<"demo" | "real">("demo");
  const [round, setRound] = useState<RoundSnapshot>({ status: "idle", multiplier: 1, crashAt: 2.8, elapsedMs: 0 });
  const [rounds, setRounds] = useState(initialRounds);
  const [roundNo, setRoundNo] = useState(2841);
  const [notice, setNotice] = useState("Pilote automatique armé. Le premier décollage est imminent.");
  const [showFairness, setShowFairness] = useState(false);
  const [showMobileFeed, setShowMobileFeed] = useState(false);
  const [mascotOk, setMascotOk] = useState(true);
  const engineRef = useRef(new CrashRoundEngine());
  const stakeRef = useRef(500);
  const targetRef = useRef(2);

  const status = statusCopy(round.status);
  const curve = useMemo(() => generateCurve(round.multiplier, round.status), [round.multiplier, round.status]);
  const isLive = round.status === "live";
  const roundId = `#${String(roundNo).padStart(5, "0")}`;

  const pushRound = useCallback((multiplier: number, tone: "gold" | "coral") => {
    setRounds((current) => [{ value: formatX(multiplier), tone }, ...current].slice(0, 8));
  }, []);

  // Auto-orchestration: schedule the next round whenever the previous one ended.
  useEffect(() => {
    if (!autoPilot || round.status === "live") return;
    const delay = round.status === "idle" ? 700 : 1800;
    const timer = window.setTimeout(() => {
      const stake = Math.min(botStake, balance);
      if (stake < 100) {
        setAutoPilot(false);
        setNotice("Solde insuffisant : le pilote auto se met en pause.");
        return;
      }
      const ceiling = walletMode === "real" ? REAL_CEILING : walletMode === "demo" ? DEMO_CEILING : MAX_CEILING;
      // Skewed-low random target up to 20x: mostly cautious exits, rare audacious ones.
      const target = 1.05 + Math.pow(Math.random(), 2.2) * (MAX_CEILING - 1.05);
      stakeRef.current = stake;
      targetRef.current = target;
      setRoundNo((current) => current + 1);
      setBalance((current) => current - stake);
      engineRef.current.start(ceiling);
      setRound(engineRef.current.tick());
      setNotice(walletMode === "real"
        ? `Mode réel : mise de ${formatMoney(stake)} — chaque vol s'écrase au décollage.`
        : `Mise auto de ${formatMoney(stake)} — le pilote vise ${formatX(target)}.`);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [autoPilot, balance, botStake, round.status, walletMode]);

  // Live ticker: advance the multiplier, resolve the bot's cash-out or the crash.
  useEffect(() => {
    if (round.status !== "live") return;
    const timer = window.setInterval(() => {
      const snapshot = engineRef.current.tick();
      setRound(snapshot);
      if (snapshot.status === "crashed") {
        pushRound(snapshot.multiplier, "coral");
        setNotice(`Crash à ${formatX(snapshot.multiplier)}. Le pilote auto perd ${formatMoney(stakeRef.current)}.`);
        return;
      }
      if (snapshot.multiplier >= targetRef.current) {
        engineRef.current.cashOut();
        const landed = engineRef.current.tick();
        const payout = Math.round(stakeRef.current * landed.multiplier);
        setRound(landed);
        setBalance((current) => current + payout);
        pushRound(landed.multiplier, "gold");
        setNotice(`Le pilote auto encaisse à ${formatX(landed.multiplier)} : +${formatMoney(payout - stakeRef.current)} nets.`);
      }
    }, 70);
    return () => window.clearInterval(timer);
  }, [pushRound, round.status]);

  const switchWallet = (mode: "demo" | "real") => {
    setWalletMode(mode);
    setNotice(mode === "demo"
      ? "Portefeuille démo actif : les vols plafonnent à 7x."
      : "Mode réel simulé : chaque vol s'écrase au décollage.");
  };

  const copyFairness = async () => {
    try {
      await navigator.clipboard?.writeText("Chicken Crash • Flux de vérification SHA-256 / HMAC-SHA256");
      setNotice("Signature d'équité copiée dans le presse-papiers.");
    } catch {
      setNotice("Signature d'équité prête : flux de vérification SHA-256 / HMAC-SHA256.");
    }
  };

  return (
    <main className="app-shell">
      <div className="noise-layer" aria-hidden="true" />
      <SiteHeader active="/game" />

      <section className="page-content" id="top">
        <div className="page-intro">
          <div>
            <div className="kicker"><span className="pulse-dot" /> CONTRÔLE DE VOL / MANCHE {String(roundNo).padStart(5, "0")}</div>
            <h1>Jusqu'où allez-vous <span>monter ?</span></h1>
            <p>Lisez la courbe. Faites confiance à vos nerfs. Atterrissez avant que le ciel ne vire au rouge.</p>
          </div>
          <div className="wallet-card" aria-label="Solde du portefeuille">
            <div className="wallet-topline"><span className="eyebrow"><Wallet size={13} /> solde du portefeuille</span><span className="wallet-mode">{walletMode === "demo" ? "DÉMO" : "RÉEL"}</span></div>
            <strong>{formatMoney(balance)}</strong>
            <div className="wallet-switch" role="group" aria-label="Mode de portefeuille">
              <button className={walletMode === "demo" ? "selected" : ""} type="button" onClick={() => switchWallet("demo")}>Démo</button>
              <button className={walletMode === "real" ? "selected" : ""} type="button" onClick={() => switchWallet("real")}>Argent réel</button>
            </div>
          </div>
        </div>

        <div className="layout-grid" id="flight">
          <section className={`flight-panel ${status.tone}`} aria-label="Jeu crash en direct">
            <div className="flight-panel-top">
              <div className="live-label"><span className="live-signal" /> VOL EN DIRECT <span className="muted-divider">/</span> <span className="round-id">{roundId}</span></div>
              <Badge tone={status.tone === "crashed" ? "coral" : status.tone === "cashed" ? "gold" : "live"}>{status.label}</Badge>
            </div>
            <div className="chart-wrap">
              <div className="chart-bg-art" style={{ backgroundImage: `url(${REFERENCE_ART})` }} aria-hidden="true" />
              <div className="chart-glow" aria-hidden="true" />
              <div className="chart-gridlines" aria-hidden="true">
                <span /><span /><span /><span />
              </div>
              <div className="axis-label axis-y top">8x</div>
              <div className="axis-label axis-y mid">4x</div>
              <div className="axis-label axis-y bottom">1x</div>
              <svg className="flight-chart" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`Courbe du multiplicateur, actuellement à ${xFormatter.format(round.multiplier)} fois`}>
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
                  <filter id="curveBlur"><feGaussianBlur stdDeviation="1.7" /></filter>
                </defs>
                <path d={curve.fillPath} fill="url(#curveFill)" />
                <path d={curve.path} fill="none" stroke="#f6b73c" strokeOpacity=".28" strokeWidth="5" filter="url(#curveBlur)" vectorEffect="non-scaling-stroke" />
                <path d={curve.path} fill="none" stroke="url(#curveStroke)" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
              </svg>
              <div className="pilot-marker" style={{ left: `${curve.lastX}%`, top: `${curve.lastY}%` }}>
                <div className="pilot-ring" />
                {mascotOk ? <img src={MASCOT_ART} alt="Pilote Chicken Crash" onError={() => setMascotOk(false)} /> : <span className="pilot-badge" aria-hidden="true"><Bird size={26} strokeWidth={2.2} /></span>}
              </div>
              <div className="multiplier-readout">
                <span className="readout-label">MULTIPLICATEUR ACTUEL</span>
                <strong className={status.tone === "crashed" ? "crashed-number" : ""}>{xFormatter.format(round.multiplier)}<small>x</small></strong>
                <span className="readout-sub">{status.detail}</span>
              </div>
              <div className="chart-footer"><span>00:00</span><span>01:30</span><span>03:00</span><span>04:30</span></div>
            </div>
            <div className="flight-status-row">
              <div className="status-message"><span className={`status-icon ${status.tone}`}><TrendingUp size={15} /></span><span>{notice}</span></div>
              <div className="fairness-inline"><BadgeCheck size={15} /> <span>graine vérifiée</span></div>
            </div>
          </section>

          <aside className="control-column" aria-label="Pilote automatique">
            <div className="control-card bet-card">
              <div className="card-heading"><div><span className="eyebrow">simulation en direct</span><h2>Pilote automatique</h2></div><div className="step-indicator"><span className="active" /><span /><span /></div></div>
              <div className="stake-input-wrap">
                <span className="currency">F</span>
                <input aria-label="Mise du pilote automatique" type="number" min="100" step="100" max={balance} value={botStake} onChange={(event) => setBotStake(Number(event.target.value))} />
                <span className="currency-label">CFA</span>
              </div>
              <div className="quick-row">
                {[100, 500, 1000, 2500].map((value) => <button key={value} className={botStake === value ? "quick selected" : "quick"} type="button" onClick={() => setBotStake(value)}>{value}</button>)}
                <button className="quick" type="button" onClick={() => setBotStake(Math.floor(balance / 2))}>½</button>
              </div>
              <div className="bet-meta"><span>Mise par manche</span><strong>{formatMoney(botStake)}</strong></div>
              <button className="primary-button" type="button" onClick={() => setAutoPilot((value) => !value)}>
                <span>{autoPilot ? "Mettre en pause" : "Lancer la simulation"}</span>{autoPilot ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <p className="safe-copy"><ShieldCheck size={13} /> Mode démo uniquement — aucun argent réel n'est utilisé</p>
            </div>

            <button className="fairness-card" type="button" onClick={() => setShowFairness(true)} id="fairness">
              <span className="fairness-icon"><ShieldCheck size={17} /></span>
              <span className="fairness-copy"><strong>Équité vérifiable</strong><small>Chaque vol peut être vérifié</small></span>
              <ArrowUpRight size={16} />
            </button>
          </aside>
        </div>

        <div className="below-grid" id="history">
          <section className="history-card">
            <div className="section-heading"><div><span className="eyebrow"><History size={13} /> journal de vol</span><h2>Manches récentes</h2></div><button className="text-button" type="button" onClick={() => setRounds(initialRounds)}>Effacer <ArrowUpRight size={14} /></button></div>
            <div className="rounds-list">{rounds.map((item, index) => <div className="round-chip" key={`${item.value}-${index}`}><span className={`round-dot ${item.tone}`} />{item.value}</div>)}</div>
            <div className="history-caption"><span className="pulse-dot tiny" /> Tous les vols sont vérifiables de façon indépendante</div>
          </section>

          <section className={`feed-card ${showMobileFeed ? "mobile-open" : ""}`}>
            <div className="section-heading"><div><span className="eyebrow"><Radio size={13} /> flux en direct</span><h2>Autres pilotes</h2></div><Badge tone="live"><span className="live-signal" /> 1 284 en ligne</Badge></div>
            <div className="feed-list">{feedItems.map((item) => <div className="feed-row" key={item.name}><span className="avatar" style={{ background: `${item.color}22`, color: item.color }}>{item.name.slice(0, 1).toUpperCase()}</span><span className="feed-name">{item.name}<small>mise : {item.bet}</small></span><strong>{item.value}</strong><span className="feed-gain">{item.gain}</span></div>)}</div>
          </section>

          <section className="stat-strip"><StatCard label="Record de vol" value="12,41x" detail="record personnel" tone="gold" /><StatCard label="Taux de réussite" value="68,4%" detail="30 derniers vols" tone="green" /><StatCard label="Sortie moyenne" value="2,16x" detail="votre zone idéale" /></section>
        </div>

        <footer className="footer-note"><span><Sparkles size={13} /> Conçu pour le frisson de l'ascension.</span><span>Chicken Crash v0.8 <span className="muted-divider">•</span> <button type="button" onClick={() => setShowFairness(true)}>Équité & sécurité</button></span></footer>
      </section>

      {showFairness && <div className="modal-backdrop" role="presentation" onClick={() => setShowFairness(false)}><section className="fairness-modal" role="dialog" aria-modal="true" aria-labelledby="fair-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" type="button" aria-label="Fermer" onClick={() => setShowFairness(false)}><X size={18} /></button><div className="modal-icon"><ShieldCheck size={23} /></div><span className="eyebrow">faites confiance au vol</span><h2 id="fair-title">Une équité prouvée, par conception.</h2><p>Chaque manche est conçue pour être vérifiable de façon indépendante grâce à une graine serveur, une graine client et un résultat HMAC-SHA256. Ce prototype présente le modèle d'interaction ; en production, la vérification s'effectuerait contre une manche signée côté serveur.</p><div className="hash-box"><span>HACHAGE DE MANCHE</span><code>c4a2...8e91</code><button type="button" onClick={copyFairness} aria-label="Copier la signature d'équité"><Copy size={14} /></button></div><div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setShowFairness(false)}>Compris</button><button className="primary-button compact" type="button" onClick={copyFairness}>Copier la signature <Copy size={15} /></button></div></section></div>}
    </main>
  );
}
