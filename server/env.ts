function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. See .env.example.`);
  }
  return value;
}

export const env = {
  get databaseUrl() {
    return required("DATABASE_URL");
  },
  get betterAuthSecret() {
    return required("BETTER_AUTH_SECRET");
  },
  get appBaseUrl() {
    return process.env.APP_BASE_URL || "http://localhost:3000";
  },
  get fedapaySecretKey() {
    return process.env.FEDAPAY_SECRET_KEY || "";
  },
  get fedapayEnvironment(): "sandbox" | "live" {
    return process.env.FEDAPAY_ENVIRONMENT === "live" ? "live" : "sandbox";
  },
  get fedapayWebhookSecret() {
    return process.env.FEDAPAY_WEBHOOK_SECRET || "";
  },
  get withdrawalAutoApprove() {
    return process.env.WITHDRAWAL_AUTO_APPROVE === "true";
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
};
