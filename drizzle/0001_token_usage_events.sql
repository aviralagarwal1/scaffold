CREATE TABLE "token_usage_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"workspace_id" uuid,
	"feature" varchar(32) NOT NULL,
	"label" varchar(80) NOT NULL,
	"tokens" integer NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"cost_usd_micros" integer,
	"provider" varchar(32),
	"model" varchar(64),
	"estimated" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "token_usage_events" ADD CONSTRAINT "token_usage_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_usage_events" ADD CONSTRAINT "token_usage_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "token_usage_events_user_created_idx" ON "token_usage_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "token_usage_events_workspace_created_idx" ON "token_usage_events" USING btree ("workspace_id","created_at");