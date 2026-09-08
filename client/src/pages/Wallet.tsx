import { TRPCClientError } from "@trpc/client";
import { ArrowDownToLine, ArrowUpFromLine, BadgeCheck, Clock3, IdCard, Lock, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";

const KYC_STATUS_META: Record<string, { label: string; icon: typeof BadgeCheck }> = {
  pending: { label: "en cours de vérification", icon: Clock3 },
  approved: { label: "vérifié", icon: BadgeCheck },
  rejected: { label: "refusé — réessayez", icon: XCircle },
};

const MODE_OPTIONS = [
  { value: "mtn_open", label: "MTN Bénin", country: "bj" },
  { value: "moov", label: "Moov Bénin", country: "bj" },
  { value: "mtn_ci", label: "MTN Côte d'Ivoire", country: "ci" },
  { value: "moov_tg", label: "Moov Togo", country: "tg" },
  { value: "togocel", label: "Togocel (Togo)", country: "tg" },
] as const;

const numberFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

const TYPE_LABEL: Record<string, string> = { deposit: "Dépôt", withdrawal: "Retrait", bet: "Mise", payout: "Gain", adjustment: "Ajustement" };
const STATUS_LABEL: Record<string, string> = { pending: "en attente", completed: "terminé", failed: "échoué", cancelled: "annulé" };

export default function Wallet() {
  const { user, balance, refresh } = useAuth();
  const [mode, setMode] = useState<(typeof MODE_OPTIONS)[number]["value"]>("mtn_open");
  const [phone, setPhone] = useState("");
  const [depositAmount, setDepositAmount] = useState(1000);
  const [withdrawAmount, setWithdrawAmount] = useState(1000);
  const [notice, setNotice] = useState<string | null>(null);

  const transactionsQuery = trpc.wallet.transactions.useQuery(undefined, { enabled: !!user });
  const entries = transactionsQuery.data?.entries ?? [];
  const depositMutation = trpc.wallet.deposit.useMutation();
  const withdrawMutation = trpc.wallet.withdraw.useMutation();
  const busy = depositMutation.isPending || withdrawMutation.isPending;

  const kycDocsQuery = trpc.kyc.myDocuments.useQuery(undefined, { enabled: !!user });
  const requestUploadUrl = trpc.kyc.requestUploadUrl.useMutation();
  const confirmUpload = trpc.kyc.confirmUpload.useMutation();
  const [kycBusy, setKycBusy] = useState(false);
  const [kycNotice, setKycNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleKycUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setKycBusy(true);
    setKycNotice(null);
    try {
      if (!["image/jpeg", "image/png", "application/pdf"].includes(file.type)) {
        setKycNotice("Format non supporté — utilisez une image JPEG/PNG ou un PDF.");
        return;
      }
      const { uploadUrl, key } = await requestUploadUrl.mutateAsync({
        documentType: "id_front",
        contentType: file.type as "image/jpeg" | "image/png" | "application/pdf",
      });
      const putResult = await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!putResult.ok) throw new Error("upload failed");
      await confirmUpload.mutateAsync({ documentType: "id_front", key });
      await kycDocsQuery.refetch();
      setKycNotice("Document envoyé, en attente de vérification.");
    } catch {
      setKycNotice("L'envoi a échoué — réessayez.");
    } finally {
      setKycBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("deposit") === "callback") {
      setNotice("Paiement en cours de confirmation par FedaPay — votre solde se met à jour automatiquement dès validation.");
      refresh();
    }
  }, [refresh]);

  const country = MODE_OPTIONS.find((option) => option.value === mode)?.country ?? "bj";

  async function handleDeposit(event: React.FormEvent) {
    event.preventDefault();
    setNotice(null);
    try {
      const result = await depositMutation.mutateAsync({ amount: depositAmount, mode, phoneNumber: phone, phoneCountry: country });
      window.location.href = result.paymentUrl;
    } catch {
      setNotice("Le dépôt n'a pas pu être initié — vérifiez le numéro et réessayez.");
    }
  }

  async function handleWithdraw(event: React.FormEvent) {
    event.preventDefault();
    setNotice(null);
    try {
      const result = await withdrawMutation.mutateAsync({ amount: withdrawAmount, mode, phoneNumber: phone, phoneCountry: country });
      await refresh();
      setNotice(
        result.status === "pending_review"
          ? "Retrait enregistré : il est en attente de validation avant l'envoi Mobile Money."
          : "Retrait envoyé vers votre compte Mobile Money.",
      );
    } catch (error) {
      setNotice(
        error instanceof TRPCClientError && error.message === "INSUFFICIENT_FUNDS" ? "Solde insuffisant pour ce retrait." : "Le retrait n'a pas pu être initié.",
      );
    }
  }

  if (!user) {
    return (
      <main className="marketing-shell info-page">
        <div className="noise-layer" aria-hidden="true" />
        <SiteHeader />
        <section className="callout-panel" style={{ margin: "80px auto" }}>
          <div>
            <span className="eyebrow">
              <Lock size={13} /> CONNEXION REQUISE
            </span>
            <h2>Connectez-vous pour gérer votre portefeuille.</h2>
          </div>
          <p>Le dépôt et le retrait Mobile Money nécessitent un compte.</p>
          <a className="primary-button" href="/login">
            Se connecter
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="marketing-shell info-page">
      <div className="noise-layer" aria-hidden="true" />
      <SiteHeader />
      <section className="info-hero">
        <span className="kicker">Portefeuille</span>
        <h1>{numberFormatter.format(balance)} FCFA</h1>
        <p>Dépôt et retrait par Mobile Money, via FedaPay.</p>
      </section>

      {notice && (
        <section className="callout-panel" style={{ marginBottom: 24 }}>
          <p style={{ gridColumn: "1 / -1" }}>{notice}</p>
        </section>
      )}

      <section className="wallet-forms">
        <form className="auth-card" onSubmit={handleDeposit}>
          <h2>
            <ArrowDownToLine size={18} /> Déposer
          </h2>
          <label className="form-field">
            <span>Opérateur Mobile Money</span>
            <select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}>
              {MODE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Numéro Mobile Money</span>
            <input required placeholder="90 00 00 00" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </label>
          <label className="form-field">
            <span>Montant (FCFA)</span>
            <input type="number" min={200} step={100} required value={depositAmount} onChange={(event) => setDepositAmount(Number(event.target.value))} />
          </label>
          <button className="primary-button" type="submit" disabled={busy}>
            Déposer {numberFormatter.format(depositAmount)} FCFA
          </button>
        </form>

        <form className="auth-card" onSubmit={handleWithdraw}>
          <h2>
            <ArrowUpFromLine size={18} /> Retirer
          </h2>
          <label className="form-field">
            <span>Opérateur Mobile Money</span>
            <select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}>
              {MODE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Numéro Mobile Money</span>
            <input required placeholder="90 00 00 00" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </label>
          <label className="form-field">
            <span>Montant (FCFA)</span>
            <input type="number" min={500} step={100} required value={withdrawAmount} onChange={(event) => setWithdrawAmount(Number(event.target.value))} />
          </label>
          <button className="secondary-button" type="submit" disabled={busy}>
            Retirer {numberFormatter.format(withdrawAmount)} FCFA
          </button>
        </form>
      </section>

      <section className="history-main" style={{ width: "min(1100px, calc(100% - 88px))", margin: "0 auto 24px" }}>
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              <IdCard size={13} /> Vérification d'identité
            </span>
            <h2>Documents KYC</h2>
          </div>
        </div>
        <p className="stat-detail" style={{ padding: "6px 0 14px" }}>
          Envoyez une pièce d'identité en cours de validité (JPEG, PNG ou PDF, 10 Mo max) pour accélérer la validation de vos retraits.
        </p>
        <div className="rounds-list" style={{ flexDirection: "column", alignItems: "stretch" }}>
          {(kycDocsQuery.data ?? []).map((doc) => {
            const meta = KYC_STATUS_META[doc.status] ?? KYC_STATUS_META.pending;
            const Icon = meta.icon;
            return (
              <div className="round-chip" key={doc.id} style={{ justifyContent: "space-between" }}>
                <span>
                  Pièce d'identité · {new Date(doc.createdAt).toLocaleDateString("fr-FR")}
                </span>
                <strong style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Icon size={13} /> {meta.label}
                </strong>
              </div>
            );
          })}
          {kycDocsQuery.data?.length === 0 && <span className="stat-detail">Aucun document envoyé pour le moment.</span>}
        </div>
        <label className="primary-button" style={{ marginTop: 14, cursor: kycBusy ? "wait" : "pointer", opacity: kycBusy ? 0.6 : 1 }}>
          <span>{kycBusy ? "Envoi en cours…" : "Envoyer une pièce d'identité"}</span>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,application/pdf" onChange={handleKycUpload} disabled={kycBusy} style={{ display: "none" }} />
        </label>
        {kycNotice && (
          <p className="stat-detail" style={{ marginTop: 8 }}>
            {kycNotice}
          </p>
        )}
      </section>

      <section className="history-main" style={{ width: "min(1100px, calc(100% - 88px))", margin: "0 auto 75px" }}>
        <div className="section-heading">
          <div>
            <span className="eyebrow">Historique</span>
            <h2>Transactions récentes</h2>
          </div>
        </div>
        <div className="rounds-list" style={{ flexDirection: "column", alignItems: "stretch" }}>
          {entries.map((entry) => (
            <div className="round-chip" key={entry.id} style={{ justifyContent: "space-between" }}>
              <span>
                {TYPE_LABEL[entry.type] ?? entry.type} · {new Date(entry.createdAt).toLocaleString("fr-FR")} · {STATUS_LABEL[entry.status] ?? entry.status}
              </span>
              <strong>
                {entry.amount >= 0 ? "+" : ""}
                {numberFormatter.format(entry.amount)} FCFA
              </strong>
            </div>
          ))}
          {entries.length === 0 && <span className="stat-detail">Aucune transaction pour le moment.</span>}
        </div>
      </section>
    </main>
  );
}
