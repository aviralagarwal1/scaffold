ALTER TABLE "profiles" ADD COLUMN "full_name" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "phone_number" varchar(32);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "handle" varchar(32);--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_handle_idx" ON "profiles" USING btree ("handle");