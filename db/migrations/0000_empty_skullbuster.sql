CREATE TABLE "bets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"round_id" bigint NOT NULL,
	"user_id" uuid NOT NULL,
	"stake" bigint NOT NULL,
	"auto_cashout_target" numeric(10, 2),
	"cashout_multiplier" numeric(10, 2),
	"payout" bigint,
	"status" text DEFAULT 'placed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bets_status_check" CHECK ("bets"."status" in ('placed','cashed','lost'))
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"amount" bigint NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"provider" text,
	"provider_ref" text,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_entries_type_check" CHECK ("ledger_entries"."type" in ('deposit','withdrawal','bet','payout','adjustment')),
	CONSTRAINT "ledger_entries_status_check" CHECK ("ledger_entries"."status" in ('pending','completed','failed','cancelled'))
);
--> statement-breakpoint
CREATE TABLE "rounds" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"nonce" bigint NOT NULL,
	"server_seed" text NOT NULL,
	"server_seed_hash" text NOT NULL,
	"crash_point" numeric(10, 2) NOT NULL,
	"status" text DEFAULT 'betting' NOT NULL,
	"betting_opens_at" timestamp with time zone NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"crashed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rounds_status_check" CHECK ("rounds"."status" in ('betting','live','crashed'))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"password_hash" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"birthdate" text NOT NULL,
	"deposit_limit_daily" bigint,
	"self_excluded_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"balance" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bets" ADD CONSTRAINT "bets_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bets" ADD CONSTRAINT "bets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bets_user_id_idx" ON "bets" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "bets_round_user_unique" ON "bets" USING btree ("round_id","user_id");--> statement-breakpoint
CREATE INDEX "ledger_entries_user_id_idx" ON "ledger_entries" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_entries_provider_ref_idx" ON "ledger_entries" USING btree ("provider","provider_ref") WHERE "ledger_entries"."provider_ref" is not null;--> statement-breakpoint
CREATE INDEX "rounds_status_idx" ON "rounds" USING btree ("status");