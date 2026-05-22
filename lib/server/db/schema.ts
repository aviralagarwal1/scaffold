import { sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const workspaceStatus = pgEnum("workspace_status", ["pending", "ingesting", "ready", "failed", "partial"]);
export const workspaceVerificationStatus = pgEnum("workspace_verification_status", ["unverified", "pending", "verified"]);
export const workspaceRole = pgEnum("workspace_role", ["owner", "editor", "viewer"]);
export const distributionPlatform = pgEnum("distribution_platform", ["twitter", "linkedin", "reddit", "facebook", "instagram"]);
export const repurposeDraftStatus = pgEnum("repurpose_draft_status", ["pending", "saved", "deleted"]);
export const grammarSeverity = pgEnum("grammar_severity", ["low", "medium", "high"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  image: text("image"),
  passwordHash: text("password_hash"),
  plan: varchar("plan", { length: 24 }).default("free").notNull(),
  stripeCustomerId: text("stripe_customer_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  stripeSubscriptionStatus: varchar("stripe_subscription_status", { length: 40 }),
  stripeCurrentPeriodEnd: timestamp("stripe_current_period_end", { withTimezone: true }),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refreshToken: text("refresh_token"),
    accessToken: text("access_token"),
    expiresAt: integer("expires_at"),
    tokenType: text("token_type"),
    scope: text("scope"),
    idToken: text("id_token"),
    sessionState: text("session_state"),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.provider, table.providerAccountId] }),
    userIdIdx: index("accounts_user_id_idx").on(table.userId),
  }),
);

export const sessions = pgTable(
  "sessions",
  {
    sessionToken: text("session_token").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (table) => ({
    userIdIdx: index("sessions_user_id_idx").on(table.userId),
  }),
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.identifier, table.token] }),
  }),
);

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fullName: text("full_name"),
    phoneNumber: varchar("phone_number", { length: 32 }),
    handle: varchar("handle", { length: 32 }),
    editorName: varchar("editor_name", { length: 80 }).notNull(),
    ...timestamps,
  },
  (table) => ({
    userIdIdx: uniqueIndex("profiles_user_id_idx").on(table.userId),
    handleIdx: uniqueIndex("profiles_handle_idx").on(table.handle),
  }),
);

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").unique(),
    publicationUrl: text("publication_url").notNull(),
    publicationName: text("publication_name"),
    status: workspaceStatus("status").default("pending").notNull(),
    verificationStatus: workspaceVerificationStatus("verification_status").default("unverified").notNull(),
    lastIngestedAt: timestamp("last_ingested_at", { withTimezone: true }),
    ingestionError: text("ingestion_error"),
    ...timestamps,
  },
  (table) => ({
    ownerIdx: index("workspaces_owner_user_id_idx").on(table.ownerUserId),
    ownerPublicationIdx: uniqueIndex("workspaces_owner_publication_url_idx").on(table.ownerUserId, table.publicationUrl),
  }),
);

export const workspaceMemberships = pgTable(
  "workspace_memberships",
  {
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: workspaceRole("role").default("owner").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.workspaceId, table.userId] }),
    userIdIdx: index("workspace_memberships_user_id_idx").on(table.userId),
  }),
);

export const workspaceVerifications = pgTable(
  "workspace_verifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    method: varchar("method", { length: 40 }).notNull(),
    targetUrl: text("target_url"),
    code: varchar("code", { length: 120 }).notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => ({
    workspaceIdIdx: index("workspace_verifications_workspace_id_idx").on(table.workspaceId),
  }),
);

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    url: text("url").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    author: text("author"),
    wordCount: integer("word_count").default(0).notNull(),
    contentText: text("content_text").notNull(),
    ...timestamps,
  },
  (table) => ({
    workspaceIdIdx: index("posts_workspace_id_idx").on(table.workspaceId),
    workspaceUrlIdx: uniqueIndex("posts_workspace_url_idx").on(table.workspaceId, table.url),
  }),
);

export const postChunks = pgTable(
  "post_chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    postChunkIdx: uniqueIndex("post_chunks_post_chunk_idx").on(table.postId, table.chunkIndex),
    workspaceIdIdx: index("post_chunks_workspace_id_idx").on(table.workspaceId),
  }),
);

export const archiveThemes = pgTable(
  "archive_themes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 120 }).notNull(),
    description: text("description").notNull(),
    evidencePostIds: jsonb("evidence_post_ids").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
    confidence: doublePrecision("confidence").default(0.45).notNull(),
    level: varchar("level", { length: 24 }).default("subtheme").notNull(),
    parentLabel: varchar("parent_label", { length: 120 }),
    aliases: jsonb("aliases").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
    importance: doublePrecision("importance").default(0.45).notNull(),
    breadth: doublePrecision("breadth").default(0.45).notNull(),
    ...timestamps,
  },
  (table) => ({
    workspaceIdIdx: index("archive_themes_workspace_id_idx").on(table.workspaceId),
    workspaceLabelIdx: uniqueIndex("archive_themes_workspace_label_idx").on(table.workspaceId, table.label),
  }),
);

export const customThemes = pgTable(
  "custom_themes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 80 }).notNull(),
    ...timestamps,
  },
  (table) => ({
    workspaceIdIdx: index("custom_themes_workspace_id_idx").on(table.workspaceId),
    workspaceLabelIdx: uniqueIndex("custom_themes_workspace_label_idx").on(table.workspaceId, table.label),
  }),
);

export const savedIdeas = pgTable(
  "saved_ideas",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    thesis: text("thesis").notNull(),
    lens: varchar("lens", { length: 120 }).notNull(),
    whyItFits: text("why_it_fits").default("").notNull(),
    relatedPosts: jsonb("related_posts").$type<unknown[]>().default(sql`'[]'::jsonb`).notNull(),
    ...timestamps,
  },
  (table) => ({
    workspaceIdIdx: index("saved_ideas_workspace_id_idx").on(table.workspaceId),
  }),
);

export const chatSessions = pgTable(
  "chat_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    ...timestamps,
  },
  (table) => ({
    workspaceIdIdx: index("chat_sessions_workspace_id_idx").on(table.workspaceId),
    userIdIdx: index("chat_sessions_user_id_idx").on(table.userId),
  }),
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => chatSessions.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 20 }).notNull(),
    content: text("content").notNull(),
    sources: jsonb("sources").$type<unknown[]>().default(sql`'[]'::jsonb`).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    sessionIdIdx: index("chat_messages_session_id_idx").on(table.sessionId),
  }),
);

export const repurposeDrafts = pgTable(
  "repurpose_drafts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    postId: uuid("post_id").references(() => posts.id, { onDelete: "set null" }),
    platform: distributionPlatform("platform").notNull(),
    status: repurposeDraftStatus("status").default("pending").notNull(),
    title: text("title"),
    content: text("content").notNull(),
    sourcePostTitle: text("source_post_title"),
    sourcePostUrl: text("source_post_url"),
    ...timestamps,
  },
  (table) => ({
    workspaceIdIdx: index("repurpose_drafts_workspace_id_idx").on(table.workspaceId),
    statusIdx: index("repurpose_drafts_status_idx").on(table.status),
  }),
);

export const grammarIssues = pgTable(
  "grammar_issues",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    postId: uuid("post_id").references(() => posts.id, { onDelete: "set null" }),
    postTitle: text("post_title"),
    issueType: varchar("issue_type", { length: 120 }).notNull(),
    severity: grammarSeverity("severity").notNull(),
    originalText: text("original_text").notNull(),
    suggestedText: text("suggested_text"),
    explanation: text("explanation").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdIdx: index("grammar_issues_workspace_id_idx").on(table.workspaceId),
    severityIdx: index("grammar_issues_severity_idx").on(table.severity),
  }),
);

export const auditRuns = pgTable(
  "audit_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    postId: uuid("post_id").references(() => posts.id, { onDelete: "set null" }),
    summary: text("summary").notNull(),
    issueCount: integer("issue_count").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdIdx: index("audit_runs_workspace_id_idx").on(table.workspaceId),
  }),
);

export const savedReviews = pgTable(
  "saved_reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: text("title"),
    draft: text("draft").notNull(),
    feedback: text("feedback").notNull(),
    sources: jsonb("sources").$type<unknown[]>().default(sql`'[]'::jsonb`).notNull(),
    ...timestamps,
  },
  (table) => ({
    workspaceIdIdx: index("saved_reviews_workspace_id_idx").on(table.workspaceId),
  }),
);

export const featureFlags = pgTable("feature_flags", {
  key: varchar("key", { length: 120 }).primaryKey(),
  enabled: boolean("enabled").default(false).notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const appState = pgTable("app_state", {
  key: varchar("key", { length: 120 }).primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
