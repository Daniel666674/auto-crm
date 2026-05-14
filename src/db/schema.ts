import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull().default(""),
  role: text("role").notNull().default("sales"),
  name: text("name"),
  image: text("image"),
  lastLogin: integer("last_login", { mode: "timestamp" }),
  policyAcknowledged: integer("policy_acknowledged", { mode: "boolean" }).notNull().default(false),
  policyAcknowledgedAt: integer("policy_acknowledged_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const contacts = sqliteTable("contacts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  source: text("source").notNull().default("otro"),
  temperature: text("temperature").notNull().default("cold"),
  score: integer("score").notNull().default(0),
  notes: text("notes"),
  engagementStatus: text("engagement_status").default("COLD"),
  needsEmailVerification: integer("needs_email_verification", { mode: "boolean" }).default(false),
  lastBrevoSync: integer("last_brevo_sync", { mode: "timestamp" }),
  consentGiven: integer("consent_given", { mode: "boolean" }).notNull().default(false),
  consentDate: integer("consent_date", { mode: "timestamp" }),
  consentSource: text("consent_source").default("unknown"),
  retentionReviewNeeded: integer("retention_review_needed", { mode: "boolean" }).notNull().default(false),
  retentionReviewDate: integer("retention_review_date", { mode: "timestamp" }),
  engagementScore: integer("engagement_score"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const pipelineStages = sqliteTable("pipeline_stages", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  order: integer("order").notNull(),
  color: text("color").notNull().default("#64748b"),
  isWon: integer("is_won", { mode: "boolean" }).notNull().default(false),
  isLost: integer("is_lost", { mode: "boolean" }).notNull().default(false),
});

export const deals = sqliteTable("deals", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  value: integer("value").notNull().default(0),
  stageId: text("stage_id").notNull().references(() => pipelineStages.id),
  contactId: text("contact_id").notNull().references(() => contacts.id),
  expectedClose: integer("expected_close", { mode: "timestamp" }),
  probability: integer("probability").notNull().default(0),
  notes: text("notes"),
  closedAt: integer("closed_at", { mode: "timestamp" }),
  closedBy: text("closed_by"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const radarEntries = sqliteTable("radar_entries", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  contactName: text("contact_name").notNull(),
  company: text("company").notNull(),
  tier: integer("tier").notNull().default(2),
  reason: text("reason").notNull(),
  trigger: text("trigger").notNull(),
  estimatedValue: integer("estimated_value"),
  bantBlocking: text("bant_blocking"),
  nextAction: text("next_action"),
  priority: text("priority").notNull().default("medium"),
  reengageDate: integer("reengage_date").notNull(),
  removedAt: integer("removed_at"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const activities = sqliteTable("activities", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  type: text("type").notNull(),
  description: text("description").notNull(),
  contactId: text("contact_id").notNull().references(() => contacts.id),
  dealId: text("deal_id").references(() => deals.id),
  scheduledAt: integer("scheduled_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const crmSettings = sqliteTable("crm_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const auditLog = sqliteTable("audit_log", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userName: text("user_name").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  detailsJson: text("details_json"),
  ipAddress: text("ip_address"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const pushSubscriptions = sqliteTable("push_subscriptions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const googleTokens = sqliteTable("google_tokens", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id),
  accessTokenEnc: text("access_token_enc").notNull(),
  refreshTokenEnc: text("refresh_token_enc"),
  expiryDate: integer("expiry_date"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const analyticsCache = sqliteTable("analytics_cache", {
  id: text("id").primaryKey(),
  data: text("data").notNull(),
  cachedAt: integer("cached_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const userPreferences = sqliteTable("user_preferences", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id),
  theme: text("theme").notNull().default("dark"),
  accentPrimary: text("accent_primary").notNull().default("#C39A4C"),
  accentSecondary: text("accent_secondary").notNull().default("#6D1F2E"),
  textColor: text("text_color").notNull().default("#e2e8f0"),
  fontFamily: text("font_family").notNull().default("inter"),
  sidebarBg: text("sidebar_bg").notNull().default("#0a0a0a"),
  sidebarBgType: text("sidebar_bg_type").notNull().default("solid"),
  sidebarBgImage: text("sidebar_bg_image"),
  uiDensity: text("ui_density").notNull().default("comfortable"),
  borderRadius: text("border_radius").notNull().default("rounded"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const notificationPreferences = sqliteTable("notification_preferences", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id),
  browserEnabled: integer("browser_enabled", { mode: "boolean" }).notNull().default(true),
  emailEnabled: integer("email_enabled", { mode: "boolean" }).notNull().default(true),
  emailDigestFrequency: text("email_digest_frequency").notNull().default("daily"),
  digestHour: integer("digest_hour").notNull().default(6),
  digestEmail: text("digest_email"),
  alertLeadHot: integer("alert_lead_hot", { mode: "boolean" }).notNull().default(true),
  alertHotThreshold: integer("alert_hot_threshold").notNull().default(70),
  alertFollowupOverdue: integer("alert_followup_overdue", { mode: "boolean" }).notNull().default(true),
  alertHandoffPending: integer("alert_handoff_pending", { mode: "boolean" }).notNull().default(true),
  alertDealMoved: integer("alert_deal_moved", { mode: "boolean" }).notNull().default(true),
  alertCampaignPerf: integer("alert_campaign_perf", { mode: "boolean" }).notNull().default(true),
  campaignPerfThreshold: integer("campaign_perf_threshold").notNull().default(50),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  resourceType: text("resource_type"),
  resourceId: text("resource_id"),
  read: integer("read", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
