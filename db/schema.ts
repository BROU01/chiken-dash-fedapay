import { relations } from "drizzle-orm";
import { bigint, bigserial, check, index, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  birthdate: text("birthdate").notNull(), // stored as ISO date string
  depositLimitDaily: bigint("deposit_limit_daily", { mode: "number" }),
  selfExcludedUntil: timestamp("self_excluded_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const wallets = pgTable("wallets", {
  userId: uuid("user_id")
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
    userId: uuid("user_id")
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
    userId: uuid("user_id")
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

export const usersRelations = relations(users, ({ one, many }) => ({
  wallet: one(wallets, { fields: [users.id], references: [wallets.userId] }),
  ledgerEntries: many(ledgerEntries),
  bets: many(bets),
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
