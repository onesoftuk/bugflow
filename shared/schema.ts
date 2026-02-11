import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, pgEnum, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const roleEnum = pgEnum("role", ["user", "dev", "admin"]);
export const ticketTypeEnum = pgEnum("ticket_type", ["bug", "feature_request"]);
export const ticketStatusEnum = pgEnum("ticket_status", ["open", "in_progress", "waiting_on_user", "resolved", "closed", "rejected"]);
export const ticketPriorityEnum = pgEnum("ticket_priority", ["low", "medium", "high", "critical"]);
export const ticketAppEnum = pgEnum("ticket_app", ["dispatch", "dispatch_admin", "admin_panel", "driver_app", "account_web_booker", "cash_web_booker"]);
export const historyKindEnum = pgEnum("history_kind", ["CREATED", "STATUS_CHANGED", "ASSIGNED", "PUBLIC_NOTE", "INTERNAL_NOTE", "ATTACHMENT_ADDED"]);
export const emailStatusEnum = pgEnum("email_status", ["queued", "sent", "failed"]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  googleId: text("google_id").unique(),
  profileImageUrl: text("profile_image_url"),
  role: roleEnum("role").notNull().default("user"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const tickets = pgTable("tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: ticketTypeEnum("type").notNull(),
  app: ticketAppEnum("app").notNull(),
  status: ticketStatusEnum("status").notNull().default("open"),
  priority: ticketPriorityEnum("priority").notNull().default("medium"),
  userId: varchar("user_id").notNull().references(() => users.id),
  assignedToUserId: varchar("assigned_to_user_id").references(() => users.id),
  assignedToName: text("assigned_to_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull().references(() => tickets.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isStatusChange: boolean("is_status_change").notNull().default(false),
  isInternal: boolean("is_internal").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const attachments = pgTable("attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull().references(() => tickets.id),
  originalName: text("original_name").notNull(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  uploadedByUserId: varchar("uploaded_by_user_id").notNull().references(() => users.id),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

export const ticketHistory = pgTable("ticket_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull().references(() => tickets.id),
  actorUserId: varchar("actor_user_id").notNull().references(() => users.id),
  actorName: text("actor_name").notNull(),
  kind: historyKindEnum("kind").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  message: text("message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const emailLogs = pgTable("email_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  toAddresses: text("to_addresses").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: emailStatusEnum("status").notNull().default("queued"),
  error: text("error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  sentAt: timestamp("sent_at"),
});

export const appSettings = pgTable("app_settings", {
  id: varchar("id").primaryKey().default("singleton"),
  smtpEnabled: boolean("smtp_enabled").notNull().default(false),
  smtpHost: text("smtp_host"),
  smtpPort: integer("smtp_port"),
  smtpSecure: boolean("smtp_secure").notNull().default(true),
  smtpUser: text("smtp_user"),
  smtpPass: text("smtp_pass"),
  smtpFromName: text("smtp_from_name"),
  smtpFromEmail: text("smtp_from_email"),
  adminRecipients: text("admin_recipients").notNull().default("peter@abacusonline.net,teambackendcoders@gmail.com"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
});

export const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().optional(),
});

export const insertTicketSchema = createInsertSchema(tickets).omit({
  id: true,
  userId: true,
  status: true,
  assignedToUserId: true,
  assignedToName: true,
  createdAt: true,
  updatedAt: true,
});

export const updateTicketStatusSchema = z.object({
  status: z.enum(["open", "in_progress", "waiting_on_user", "resolved", "closed", "rejected"]),
  comment: z.string().optional(),
});

export const assignTicketSchema = z.object({
  assignedToUserId: z.string().nullable(),
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  userId: true,
  isStatusChange: true,
  createdAt: true,
});

export const updateUserRoleSchema = z.object({
  role: z.enum(["user", "dev", "admin"]),
});

export const updateSettingsSchema = z.object({
  smtpEnabled: z.boolean(),
  smtpHost: z.string().nullable().optional(),
  smtpPort: z.number().nullable().optional(),
  smtpSecure: z.boolean().optional(),
  smtpUser: z.string().nullable().optional(),
  smtpPass: z.string().nullable().optional(),
  smtpFromName: z.string().nullable().optional(),
  smtpFromEmail: z.string().nullable().optional(),
  adminRecipients: z.string().optional(),
});

export const APP_LABELS: Record<string, string> = {
  dispatch: "Dispatch",
  dispatch_admin: "Dispatch Admin",
  admin_panel: "Admin Panel",
  driver_app: "Driver App",
  account_web_booker: "Account Web Booker",
  cash_web_booker: "Cash Web Booker",
};

export const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  waiting_on_user: "Waiting on User",
  resolved: "Resolved",
  closed: "Closed",
  rejected: "Rejected",
};

export const PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Attachment = typeof attachments.$inferSelect;
export type TicketHistory = typeof ticketHistory.$inferSelect;
export type EmailLog = typeof emailLogs.$inferSelect;
export type AppSettings = typeof appSettings.$inferSelect;
