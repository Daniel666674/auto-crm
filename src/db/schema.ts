import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

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
  title: text("title"),
  industry: text("industry"),
  location: text("location"),
  linkedinUrl: text("linkedin_url"),
  whatsappNumber: text("whatsapp_number"),
  tags: text("tags"),
  apolloId: text("apollo_id"),
  returnedToMarketingAt: integer("returned_to_marketing_at", { mode: "timestamp" }),
  returnedToMarketingReason: text("returned_to_marketing_reason"),
  lifecycleStage: text("lifecycle_stage").notNull().default("lead"),
  firstTouchCampaignId: text("first_touch_campaign_id"),
  lastTouchCampaignId: text("last_touch_campaign_id"),
  assistingCampaignIds: text("assisting_campaign_ids"),
  reengagementQueuedAt: integer("reengagement_queued_at", { mode: "timestamp" }),
  customFields: text("custom_fields"), // JSON object { [fieldId]: value }
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
  defaultProbability: integer("default_probability").notNull().default(0),
});

export const deals = sqliteTable("deals", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  value: integer("value").notNull().default(0),
  usdValue: integer("usd_value"),
  fxRate: real("fx_rate"),
  customFields: text("custom_fields"), // JSON object { [fieldId]: value }
  stageId: text("stage_id").notNull().references(() => pipelineStages.id),
  contactId: text("contact_id").notNull().references(() => contacts.id),
  expectedClose: integer("expected_close", { mode: "timestamp" }),
  probability: integer("probability").notNull().default(0),
  notes: text("notes"),
  closedAt: integer("closed_at", { mode: "timestamp" }),
  closedBy: text("closed_by"),
  closeReasonId: text("close_reason_id"),
  ownerId: text("owner_id"),
  competitor: text("competitor"),
  isRecurring: integer("is_recurring", { mode: "boolean" }).notNull().default(false),
  recurringInterval: text("recurring_interval"),
  paymentLinkUrl: text("payment_link_url"),
  paymentStatus: text("payment_status"),
  paymentProvider: text("payment_provider"),
  paymentReference: text("payment_reference"),
  paidAt: integer("paid_at", { mode: "timestamp" }),
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

export const customFieldDefs = sqliteTable("custom_field_defs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  entity: text("entity").notNull(), // "contact" | "deal"
  label: text("label").notNull(),
  fieldKey: text("field_key").notNull(),
  type: text("type").notNull().default("text"), // text | number | select | date | boolean
  options: text("options"), // JSON array of strings, for type=select
  order: integer("order").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const dealLineItems = sqliteTable("deal_line_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  dealId: text("deal_id").notNull().references(() => deals.id),
  label: text("label").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: integer("unit_price").notNull().default(0), // COP cents
  order: integer("order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const calendarEvents = sqliteTable("calendar_events", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  date: text("date").notNull(), // ISO yyyy-mm-dd
  time: text("time").notNull().default("10:00"),
  duration: integer("duration").notNull().default(60),
  type: text("type").notNull().default("Reunión"),
  participants: text("participants").notNull().default("[]"), // JSON array of emails
  notes: text("notes"),
  googleEventId: text("google_event_id"), // set when mirrored to Google Workspace calendar
  createdBy: text("created_by"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
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
  scope: text("scope"), // space-separated granted OAuth scopes
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

export const closeReasons = sqliteTable("close_reasons", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  type: text("type").notNull(), // "won" | "lost"
  label: text("label").notNull(),
  order: integer("order").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const salesTargets = sqliteTable("sales_targets", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id),
  period: text("period").notNull(), // "monthly" | "quarterly" | "annual"
  year: integer("year").notNull(),
  month: integer("month"), // 1-12, null if quarterly/annual
  quarter: integer("quarter"), // 1-4, null if monthly/annual
  targetValue: integer("target_value").notNull().default(0), // cents
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
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

// API tokens for external integrations (bearer auth on /api/v1/*)
export const apiTokens = sqliteTable("api_tokens", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  // Stored as sha256 hex — plaintext only shown once on creation
  tokenHash: text("token_hash").notNull().unique(),
  // Last 4 chars of plaintext for display
  tokenPreview: text("token_preview").notNull(),
  // CSV of scopes: "read:contacts,write:deals" etc.
  scopes: text("scopes").notNull().default("read:all"),
  createdBy: text("created_by").notNull().references(() => users.id),
  lastUsedAt: integer("last_used_at", { mode: "timestamp" }),
  revokedAt: integer("revoked_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Marketing campaign outcomes (analog of close_reasons, for campaigns)
export const campaignOutcomes = sqliteTable("campaign_outcomes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  type: text("type").notNull(), // "success" | "underperformed" | "cancelled"
  label: text("label").notNull(),
  order: integer("order").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Marketing targets per user (leads, handoffs, qualified opportunities)
export const marketingTargets = sqliteTable("marketing_targets", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id),
  // "leads" | "handoffs" | "qualified" | "engagement_rate"
  metric: text("metric").notNull(),
  period: text("period").notNull(),
  year: integer("year").notNull(),
  month: integer("month"),
  quarter: integer("quarter"),
  // For "engagement_rate" stored as basis points (e.g., 2500 = 25%). For counts, raw count.
  targetValue: integer("target_value").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const clients = sqliteTable("clients", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  dealId: text("deal_id").references(() => deals.id),
  contactId: text("contact_id").references(() => contacts.id),
  company: text("company").notNull(),
  name: text("name").notNull(),
  contractValue: integer("contract_value").notNull().default(0),
  startDate: integer("start_date", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  endDate: integer("end_date", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  healthScore: integer("health_score").notNull().default(8),
  renewalStage: text("renewal_stage").notNull().default("Saludable"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const deliverables = sqliteTable("deliverables", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  clientId: text("client_id").notNull().references(() => clients.id),
  title: text("title").notNull(),
  status: text("status").notNull().default("Pendiente"),
  dueDate: integer("due_date", { mode: "timestamp" }),
  owner: text("owner").notNull().default(""),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const proposals = sqliteTable("proposals", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  dealId: text("deal_id").references(() => deals.id),
  contactName: text("contact_name").notNull().default(""),
  dealTitle: text("deal_title").notNull(),
  value: integer("value").notNull().default(0),
  status: text("status").notNull().default("Borrador"),
  sentDate: integer("sent_date", { mode: "timestamp" }),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Workflow automation triggers
export const workflowTriggers = sqliteTable("workflow_triggers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  // "deal_stage_changed" | "contact_score_reached" | "lead_created" | "deal_created" | "followup_overdue"
  eventType: text("event_type").notNull(),
  conditions: text("conditions").notNull().default("{}"),   // JSON object
  actions: text("actions").notNull().default("[]"),          // JSON array of action objects
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Outreach sequences — named multi-step follow-up templates
export const sequences = sqliteTable("sequences", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  stepsJson: text("steps_json").notNull().default("[]"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const sequenceEnrollments = sqliteTable("sequence_enrollments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  sequenceId: text("sequence_id").notNull().references(() => sequences.id),
  contactId: text("contact_id").notNull().references(() => contacts.id),
  currentStep: integer("current_step").notNull().default(0),
  status: text("status").notNull().default("active"),
  startedAt: integer("started_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  // When the current step becomes due to execute (null = awaiting manual advance / nothing scheduled)
  nextActionAt: integer("next_action_at", { mode: "timestamp" }),
  lastSentAt: integer("last_sent_at", { mode: "timestamp" }),
  lastError: text("last_error"),
});

// Email events from BlackScale-sent mail (sequences, campaigns) — replaces Brevo's event stream
export const emailEvents = sqliteTable("email_events", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  contactId: text("contact_id").references(() => contacts.id),
  sequenceId: text("sequence_id"),
  enrollmentId: text("enrollment_id"),
  campaignId: text("campaign_id"),
  messageId: text("message_id"),
  type: text("type").notNull(), // sent | open | click | bounce | unsubscribe | complaint
  url: text("url"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// One-off bulk email blasts sent through BlackScale email (not Brevo)
export const blastCampaigns = sqliteTable("blast_campaigns", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  audienceJson: text("audience_json").notNull().default("{}"),
  status: text("status").notNull().default("draft"), // draft | sending | sent | failed
  totalRecipients: integer("total_recipients").notNull().default(0),
  sentCount: integer("sent_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  skippedCount: integer("skipped_count").notNull().default(0),
  lastError: text("last_error"),
  createdBy: text("created_by"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  sentAt: integer("sent_at", { mode: "timestamp" }),
});

// Suppression list — emails that must never receive automated mail again
export const emailSuppressions = sqliteTable("email_suppressions", {
  email: text("email").primaryKey(),
  reason: text("reason").notNull().default("unsubscribe"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const mktSegments = sqliteTable("mkt_segments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  rulesJson: text("rules_json").notNull().default("{}"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const clientPortals = sqliteTable("client_portals", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  token: text("token").notNull().unique(),
  contactId: text("contact_id").notNull().references(() => contacts.id),
  title: text("title").notNull().default("Portal del Cliente"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  createdBy: text("created_by"),
  configJson: text("config_json").notNull().default("{}"),
  clientCompany: text("client_company"),
});
