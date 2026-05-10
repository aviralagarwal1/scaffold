CREATE TABLE "post_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"post_id" text NOT NULL,
	"quote" text NOT NULL,
	"prefix" text DEFAULT '' NOT NULL,
	"suffix" text DEFAULT '' NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "post_notes" ADD CONSTRAINT "post_notes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "post_notes_workspace_id_idx" ON "post_notes" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "post_notes_workspace_post_idx" ON "post_notes" USING btree ("workspace_id","post_id");