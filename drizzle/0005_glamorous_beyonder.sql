CREATE VIEW "public"."account_profiles" AS (
  select
    "users"."id" as "user_id",
    "users"."email" as "email",
    "users"."email_verified" as "email_verified",
    "profiles"."full_name" as "full_name",
    "profiles"."phone_number" as "phone_number",
    "profiles"."handle" as "handle",
    "users"."name" as "creator_name",
    "profiles"."editor_name" as "editor_name",
    "users"."plan" as "plan",
    "profiles"."created_at" as "created_at",
    "profiles"."updated_at" as "updated_at"
  from "users"
  left join "profiles" on "profiles"."user_id" = "users"."id"
);