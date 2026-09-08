import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env";

/**
 * Minimal FedaPay REST client for Mobile Money deposits (Transactions API) and
 * withdrawals (Payouts API). Built from FedaPay's public documentation
 * (docs.fedapay.com); this environment's network policy blocks fetching that
 * documentation directly, so double-check field names and the webhook
 * signature scheme against your own FedaPay dashboard/docs before go-live —
 * the sandbox base URL below is the safe place to do that verification.
 */

function baseUrl(): string {
  return env.fedapayEnvironment === "live" ? "https://api.fedapay.com/v1" : "https://sandbox-api.fedapay.com/v1";
}

async function fedapayFetch<T>(path: string, init: RequestInit): Promise<T> {
  if (!env.fedapaySecretKey) {
    throw new Error("FEDAPAY_SECRET_KEY is not set. See .env.example.");
  }
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.fedapaySecretKey}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`FedaPay API error (${res.status}): ${JSON.stringify(body)}`);
  }
  return body as T;
}

export interface FedaPayCustomer {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  phoneCountry: string;
}

export interface DepositResult {
  transactionId: number;
  paymentUrl: string;
}

/** Mobile Money deposit: create the transaction, then request its checkout/payment link. */
export async function createDeposit(params: { amount: number; description: string; customer: FedaPayCustomer; userId: string }): Promise<DepositResult> {
  const created = await fedapayFetch<{ v1: { transaction: { id: number } } }>("/transactions", {
    method: "POST",
    body: JSON.stringify({
      description: params.description,
      amount: params.amount,
      currency: { iso: "XOF" },
      callback_url: `${env.appBaseUrl}/wallet?deposit=callback`,
      merchant_reference: params.userId,
      customer: {
        firstname: params.customer.firstName,
        lastname: params.customer.lastName,
        email: params.customer.email,
        phone_number: { number: params.customer.phoneNumber, country: params.customer.phoneCountry },
      },
    }),
  });
  const transactionId = created.v1.transaction.id;

  const token = await fedapayFetch<{ v1: { token: string; url: string } }>(`/transactions/${transactionId}/token`, {
    method: "POST",
    body: JSON.stringify({}),
  });

  return { transactionId, paymentUrl: token.v1.url };
}

export interface PayoutResult {
  payoutId: number;
  status: string;
}

/** Mobile Money withdrawal: transfer funds from the merchant FedaPay account to the customer. */
export async function createPayout(params: { amount: number; mode: string; customer: FedaPayCustomer }): Promise<PayoutResult> {
  const created = await fedapayFetch<{ v1: { payout: { id: number; status: string } } }>("/payouts", {
    method: "POST",
    body: JSON.stringify({
      amount: params.amount,
      currency: { iso: "XOF" },
      mode: params.mode,
      customer: {
        firstname: params.customer.firstName,
        lastname: params.customer.lastName,
        email: params.customer.email,
        phone_number: { number: params.customer.phoneNumber, country: params.customer.phoneCountry },
      },
    }),
  });
  return { payoutId: created.v1.payout.id, status: created.v1.payout.status };
}

/**
 * Verify the `X-FEDAPAY-SIGNATURE` header against the raw webhook body using
 * the webhook signing secret from the FedaPay dashboard. Confirm this
 * matches FedaPay's documented scheme (HMAC-SHA256 of the raw payload) before
 * relying on it in production — see the note at the top of this file.
 */
export function verifyWebhookSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
  if (!signatureHeader || !env.fedapayWebhookSecret) return false;
  const expected = createHmac("sha256", env.fedapayWebhookSecret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "utf-8");
  const actualBuf = Buffer.from(signatureHeader, "utf-8");
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}

export interface FedaPayWebhookEvent {
  name: string;
  entity: Record<string, unknown> & { id?: number; status?: string; merchant_reference?: string; amount?: number };
}

export function parseWebhookEvent(rawBody: Buffer): FedaPayWebhookEvent {
  const payload = JSON.parse(rawBody.toString("utf-8"));
  return { name: payload.name ?? payload.event, entity: payload.entity ?? payload.data ?? {} };
}
