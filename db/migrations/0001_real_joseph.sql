CREATE TABLE "kyc_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"document_type" text NOT NULL,
	"r2_key" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kyc_documents_type_check" CHECK ("kyc_documents"."document_type" in ('id_front','id_back','proof_of_address')),
	CONSTRAINT "kyc_documents_status_check" CHECK ("kyc_documents"."status" in ('pending','approved','rejected'))
);
--> statement-breakpoint
ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "kyc_documents_user_id_idx" ON "kyc_documents" USING btree ("user_id","created_at");