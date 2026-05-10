CREATE TYPE "public"."distribution_platform" AS ENUM('twitter', 'linkedin', 'reddit', 'facebook', 'instagram');--> statement-breakpoint
CREATE TYPE "public"."grammar_severity" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."repurpose_draft_status" AS ENUM('pending', 'saved', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."workspace_role" AS ENUM('owner', 'editor', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."workspace_status" AS ENUM('pending', 'ingesting', 'ready', 'failed', 'partial');--> statement-breakpoint
CREATE TABLE "app_state" (
	"key" varchar(120) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "archive_themes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"label" varchar(120) NOT NULL,
	"description" text NOT NULL,
	"evidence_post_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confidence" double precision DEFAULT 0.45 NOT NULL,
	"level" varchar(24) DEFAULT 'subtheme' NOT NULL,
	"parent_label" varchar(120),
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"importance" double precision DEFAULT 0.45 NOT NULL,
	"breadth" double precision DEFAULT 0.45 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_themes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"label" varchar(80) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grammar_issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"post_id" uuid,
	"post_title" text,
	"issue_type" varchar(120) NOT NULL,
	"severity" "grammar_severity" NOT NULL,
	"original_text" text NOT NULL,
	"suggested_text" text,
	"explanation" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"url" text NOT NULL,
	"published_at" timestamp with time zone,
	"author" text,
	"word_count" integer DEFAULT 0 NOT NULL,
	"content_text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"full_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repurpose_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"post_id" uuid,
	"platform" "distribution_platform" NOT NULL,
	"status" "repurpose_draft_status" DEFAULT 'pending' NOT NULL,
	"title" text,
	"content" text NOT NULL,
	"source_post_title" text,
	"source_post_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_ideas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"title" text NOT NULL,
	"thesis" text NOT NULL,
	"lens" varchar(120) NOT NULL,
	"why_it_fits" text DEFAULT '' NOT NULL,
	"related_posts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"title" text,
	"draft" text NOT NULL,
	"feedback" text NOT NULL,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"email_verified" timestamp with time zone,
	"image" text,
	"password_hash" text,
	"plan" varchar(24) DEFAULT 'free' NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"stripe_subscription_status" varchar(40),
	"stripe_current_period_end" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_stripe_customer_id_unique" UNIQUE("stripe_customer_id"),
	CONSTRAINT "users_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "workspace_memberships" (
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "workspace_role" DEFAULT 'owner' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_memberships_workspace_id_user_id_pk" PRIMARY KEY("workspace_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"token" text,
	"publication_url" text NOT NULL,
	"publication_name" text,
	"status" "workspace_status" DEFAULT 'pending' NOT NULL,
	"last_ingested_at" timestamp with time zone,
	"ingestion_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "archive_themes" ADD CONSTRAINT "archive_themes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_themes" ADD CONSTRAINT "custom_themes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grammar_issues" ADD CONSTRAINT "grammar_issues_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grammar_issues" ADD CONSTRAINT "grammar_issues_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_chunks" ADD CONSTRAINT "post_chunks_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_chunks" ADD CONSTRAINT "post_chunks_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repurpose_drafts" ADD CONSTRAINT "repurpose_drafts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repurpose_drafts" ADD CONSTRAINT "repurpose_drafts_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_ideas" ADD CONSTRAINT "saved_ideas_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_reviews" ADD CONSTRAINT "saved_reviews_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "archive_themes_workspace_id_idx" ON "archive_themes" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "archive_themes_workspace_label_idx" ON "archive_themes" USING btree ("workspace_id","label");--> statement-breakpoint
CREATE INDEX "chat_messages_session_id_idx" ON "chat_messages" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "chat_sessions_workspace_id_idx" ON "chat_sessions" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "chat_sessions_user_id_idx" ON "chat_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "custom_themes_workspace_id_idx" ON "custom_themes" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "custom_themes_workspace_label_idx" ON "custom_themes" USING btree ("workspace_id","label");--> statement-breakpoint
CREATE INDEX "grammar_issues_workspace_id_idx" ON "grammar_issues" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "grammar_issues_severity_idx" ON "grammar_issues" USING btree ("severity");--> statement-breakpoint
CREATE UNIQUE INDEX "post_chunks_post_chunk_idx" ON "post_chunks" USING btree ("post_id","chunk_index");--> statement-breakpoint
CREATE INDEX "post_chunks_workspace_id_idx" ON "post_chunks" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "posts_workspace_id_idx" ON "posts" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "posts_workspace_url_idx" ON "posts" USING btree ("workspace_id","url");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_user_id_idx" ON "profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "repurpose_drafts_workspace_id_idx" ON "repurpose_drafts" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "repurpose_drafts_status_idx" ON "repurpose_drafts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "saved_ideas_workspace_id_idx" ON "saved_ideas" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "saved_reviews_workspace_id_idx" ON "saved_reviews" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_memberships_user_id_idx" ON "workspace_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "workspaces_owner_user_id_idx" ON "workspaces" USING btree ("owner_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspaces_owner_publication_url_idx" ON "workspaces" USING btree ("owner_user_id","publication_url");