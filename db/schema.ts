import { relations, sql } from "drizzle-orm";
import { bigint, bigserial, boolean, check, index, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

/**
 * Better Auth-managed tables (user/session/account/verification). IDs are
 * `text`, not `uuid` — Better Auth generates its own opaque id strings (not
 * necessarily RFC4122 UUIDs) and always supplies them on insert, so a
 * Postgres `uuid` column would reject them. Field *names* below (camelCase
 * keys) are what the drizzleAdapter maps against — verified against Better
 * Auth's own `getSchema()` output for our exact config, not guessed from
 * memory. See server/betterAuth.ts.
 */
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  // --- Chicken Crash-specific fields (Better Auth additionalFields) ---
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone").notNull(),
  birthdate: text("birthdate").notNull(), // stored as ISO date string
  depositLimitDaily: bigint("deposit_limit_daily", { mode: "number" }),
  selfExcludedUntil: timestamp("self_excluded_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const wallets = pgTable("wallets", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  balance: bigint("balance", { mode: "number" }).notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ledgerTypeValues = ["deposit", "withdrawal", "bet", "payout", "adjustment"] as const;
export const ledgerStatusValues = ["pending", "completed", "failed", "cancelled"] as const;

export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type", { enum: ledgerTypeValues }).notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    status: text("status", { enum: ledgerStatusValues }).notNull().default("completed"),
    provider: text("provider"),
    providerRef: text("provider_ref"),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("ledger_entries_user_id_idx").on(table.userId, table.createdAt),
    uniqueIndex("ledger_entries_provider_ref_idx")
      .on(table.provider, table.providerRef)
      .where(sql`${table.providerRef} is not null`),
    check("ledger_entries_type_check", sql`${table.type} in ('deposit','withdrawal','bet','payout','adjustment')`),
    check("ledger_entries_status_check", sql`${table.status} in ('pending','completed','failed','cancelled')`),
  ],
);

export const roundStatusValues = ["betting", "live", "crashed"] as const;

export const rounds = pgTable(
  "rounds",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    nonce: bigint("nonce", { mode: "number" }).notNull(),
    serverSeed: text("server_seed").notNull(),
    serverSeedHash: text("server_seed_hash").notNull(),
    crashPoint: numeric("crash_point", { precision: 10, scale: 2, mode: "number" }).notNull(),
    status: text("status", { enum: roundStatusValues }).notNull().default("betting"),
    bettingOpensAt: timestamp("betting_opens_at", { withTimezone: true }).notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    crashedAt: timestamp("crashed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("rounds_status_idx").on(table.status),
    check("rounds_status_check", sql`${table.status} in ('betting','live','crashed')`),
  ],
);

export const betStatusValues = ["placed", "cashed", "lost"] as const;

export const bets = pgTable(
  "bets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roundId: bigint("round_id", { mode: "number" })
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    stake: bigint("stake", { mode: "number" }).notNull(),
    autoCashoutTarget: numeric("auto_cashout_target", { precision: 10, scale: 2, mode: "number" }),
    cashoutMultiplier: numeric("cashout_multiplier", { precision: 10, scale: 2, mode: "number" }),
    payout: bigint("payout", { mode: "number" }),
    status: text("status", { enum: betStatusValues }).notNull().default("placed"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("bets_user_id_idx").on(table.userId, table.createdAt),
    uniqueIndex("bets_round_user_unique").on(table.roundId, table.userId),
    check("bets_status_check", sql`${table.status} in ('placed','cashed','lost')`),
  ],
);

export const kycDocumentTypeValues = ["id_front", "id_back", "proof_of_address"] as const;
export const kycDocumentStatusValues = ["pending", "approved", "rejected"] as const;

export const kycDocuments = pgTable(
  "kyc_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    documentType: text("document_type", { enum: kycDocumentTypeValues }).notNull(),
    r2Key: text("r2_key").notNull(),
    status: text("status", { enum: kycDocumentStatusValues }).notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("kyc_documents_user_id_idx").on(table.userId, table.createdAt),
    check("kyc_documents_type_check", sql`${table.documentType} in ('id_front','id_back','proof_of_address')`),
    check("kyc_documents_status_check", sql`${table.status} in ('pending','approved','rejected')`),
  ],
);

export const usersRelations = relations(users, ({ one, many }) => ({
  wallet: one(wallets, { fields: [users.id], references: [wallets.userId] }),
  ledgerEntries: many(ledgerEntries),
  bets: many(bets),
  sessions: many(sessions),
  accounts: many(accounts),
  kycDocuments: many(kycDocuments),
}));

export const kycDocumentsRelations = relations(kycDocuments, ({ one }) => ({
  user: one(users, { fields: [kycDocuments.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const roundsRelations = relations(rounds, ({ many }) => ({
  bets: many(bets),
}));

export const betsRelations = relations(bets, ({ one }) => ({
  round: one(rounds, { fields: [bets.roundId], references: [rounds.id] }),
  user: one(users, { fields: [bets.userId], references: [users.id] }),
}));

export type User = typeof users.$inferSelect;
export type Wallet = typeof wallets.$inferSelect;
export type LedgerEntry = typeof ledgerEntries.$inferSelect;
export type Round = typeof rounds.$inferSelect;
export type Bet = typeof bets.$inferSelect;
export type KycDocument = typeof kycDocuments.$inferSelect;
