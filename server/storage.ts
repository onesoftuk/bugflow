import { eq, desc, and } from "drizzle-orm";
import { db } from "./db";
import {
  users, tickets, comments, attachments, ticketHistory, emailLogs, appSettings,
  type User, type InsertUser, type Ticket, type InsertTicket, type Comment, type InsertComment,
  type Attachment, type TicketHistory, type EmailLog, type AppSettings,
} from "../shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUserRole(id: string, role: string): Promise<User | undefined>;
  updateUserActive(id: string, isActive: boolean): Promise<User | undefined>;
  linkGoogleAccount(userId: string, googleId: string, profileImageUrl?: string): Promise<User | undefined>;

  getTicketsByUserId(userId: string): Promise<Ticket[]>;
  getTicketsAssignedToUserId(userId: string): Promise<Ticket[]>;
  getAllTickets(): Promise<(Ticket & { user: { username: string; email: string } })[]>;
  getTicketById(id: string): Promise<Ticket | undefined>;
  createTicket(ticket: InsertTicket & { userId: string }): Promise<Ticket>;
  updateTicketStatus(id: string, status: string): Promise<Ticket | undefined>;
  assignTicket(id: string, assignedToUserId: string | null, assignedToName: string | null): Promise<Ticket | undefined>;
  deleteTicket(id: string): Promise<void>;

  getCommentsByTicketId(ticketId: string): Promise<(Comment & { user: { username: string; role: string } })[]>;
  createComment(comment: InsertComment & { userId: string; isStatusChange?: boolean }): Promise<Comment>;

  getAttachmentsByTicketId(ticketId: string): Promise<Attachment[]>;
  getAttachmentById(id: string): Promise<Attachment | undefined>;
  createAttachment(attachment: Omit<Attachment, "id" | "uploadedAt">): Promise<Attachment>;

  getHistoryByTicketId(ticketId: string): Promise<TicketHistory[]>;
  createHistory(entry: Partial<Omit<TicketHistory, "id" | "createdAt">> & { ticketId: string; actorUserId: string; actorName: string; kind: TicketHistory["kind"] }): Promise<TicketHistory>;

  getEmailLogs(): Promise<EmailLog[]>;
  createEmailLog(log: Omit<EmailLog, "id" | "createdAt" | "sentAt">): Promise<EmailLog>;
  updateEmailLog(id: string, status: string, error?: string): Promise<void>;

  getSettings(): Promise<AppSettings | undefined>;
  updateSettings(settings: Partial<AppSettings>): Promise<AppSettings | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user;
  }

  async linkGoogleAccount(userId: string, googleId: string, profileImageUrl?: string): Promise<User | undefined> {
    const updates: any = { googleId, updatedAt: new Date() };
    if (profileImageUrl) updates.profileImageUrl = profileImageUrl;
    const [user] = await db.update(users).set(updates).where(eq(users.id, userId)).returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserRole(id: string, role: string): Promise<User | undefined> {
    const [user] = await db.update(users).set({ role: role as any, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return user;
  }

  async updateUserActive(id: string, isActive: boolean): Promise<User | undefined> {
    const [user] = await db.update(users).set({ isActive, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return user;
  }

  async getTicketsByUserId(userId: string): Promise<Ticket[]> {
    return db.select().from(tickets).where(eq(tickets.userId, userId)).orderBy(desc(tickets.createdAt));
  }

  async getTicketsAssignedToUserId(userId: string): Promise<Ticket[]> {
    return db.select().from(tickets).where(eq(tickets.assignedToUserId, userId)).orderBy(desc(tickets.createdAt));
  }

  async getAllTickets(): Promise<(Ticket & { user: { username: string; email: string } })[]> {
    const result = await db
      .select({
        id: tickets.id,
        title: tickets.title,
        description: tickets.description,
        type: tickets.type,
        app: tickets.app,
        status: tickets.status,
        priority: tickets.priority,
        userId: tickets.userId,
        assignedToUserId: tickets.assignedToUserId,
        assignedToName: tickets.assignedToName,
        createdAt: tickets.createdAt,
        updatedAt: tickets.updatedAt,
        username: users.username,
        email: users.email,
      })
      .from(tickets)
      .leftJoin(users, eq(tickets.userId, users.id))
      .orderBy(desc(tickets.createdAt));

    return result.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      type: r.type,
      app: r.app,
      status: r.status,
      priority: r.priority,
      userId: r.userId,
      assignedToUserId: r.assignedToUserId,
      assignedToName: r.assignedToName,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      user: { username: r.username || "Unknown", email: r.email || "" },
    }));
  }

  async getTicketById(id: string): Promise<Ticket | undefined> {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
    return ticket;
  }

  async createTicket(ticket: InsertTicket & { userId: string }): Promise<Ticket> {
    const [newTicket] = await db.insert(tickets).values(ticket).returning();
    return newTicket;
  }

  async updateTicketStatus(id: string, status: string): Promise<Ticket | undefined> {
    const [updated] = await db
      .update(tickets)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(tickets.id, id))
      .returning();
    return updated;
  }

  async assignTicket(id: string, assignedToUserId: string | null, assignedToName: string | null): Promise<Ticket | undefined> {
    const [updated] = await db
      .update(tickets)
      .set({ assignedToUserId, assignedToName, updatedAt: new Date() })
      .where(eq(tickets.id, id))
      .returning();
    return updated;
  }

  async deleteTicket(id: string): Promise<void> {
    await db.delete(attachments).where(eq(attachments.ticketId, id));
    await db.delete(comments).where(eq(comments.ticketId, id));
    await db.delete(ticketHistory).where(eq(ticketHistory.ticketId, id));
    await db.delete(tickets).where(eq(tickets.id, id));
  }

  async getCommentsByTicketId(ticketId: string): Promise<(Comment & { user: { username: string; role: string } })[]> {
    const result = await db
      .select({
        id: comments.id,
        ticketId: comments.ticketId,
        userId: comments.userId,
        content: comments.content,
        isStatusChange: comments.isStatusChange,
        isInternal: comments.isInternal,
        createdAt: comments.createdAt,
        username: users.username,
        role: users.role,
      })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.ticketId, ticketId))
      .orderBy(comments.createdAt);

    return result.map((r) => ({
      id: r.id,
      ticketId: r.ticketId,
      userId: r.userId,
      content: r.content,
      isStatusChange: r.isStatusChange,
      isInternal: r.isInternal,
      createdAt: r.createdAt,
      user: { username: r.username || "Unknown", role: r.role || "user" },
    }));
  }

  async createComment(comment: InsertComment & { userId: string; isStatusChange?: boolean }): Promise<Comment> {
    const [newComment] = await db
      .insert(comments)
      .values({
        ticketId: comment.ticketId,
        userId: comment.userId,
        content: comment.content,
        isStatusChange: comment.isStatusChange || false,
        isInternal: comment.isInternal || false,
      })
      .returning();
    return newComment;
  }

  async getAttachmentsByTicketId(ticketId: string): Promise<Attachment[]> {
    return db.select().from(attachments).where(eq(attachments.ticketId, ticketId)).orderBy(desc(attachments.uploadedAt));
  }

  async getAttachmentById(id: string): Promise<Attachment | undefined> {
    const [attachment] = await db.select().from(attachments).where(eq(attachments.id, id));
    return attachment;
  }

  async createAttachment(attachment: Omit<Attachment, "id" | "uploadedAt">): Promise<Attachment> {
    const [newAttachment] = await db.insert(attachments).values(attachment).returning();
    return newAttachment;
  }

  async getHistoryByTicketId(ticketId: string): Promise<TicketHistory[]> {
    return db.select().from(ticketHistory).where(eq(ticketHistory.ticketId, ticketId)).orderBy(desc(ticketHistory.createdAt));
  }

  async createHistory(entry: Partial<Omit<TicketHistory, "id" | "createdAt">> & { ticketId: string; actorUserId: string; actorName: string; kind: TicketHistory["kind"] }): Promise<TicketHistory> {
    const [newEntry] = await db.insert(ticketHistory).values(entry).returning();
    return newEntry;
  }

  async getEmailLogs(): Promise<EmailLog[]> {
    return db.select().from(emailLogs).orderBy(desc(emailLogs.createdAt));
  }

  async createEmailLog(log: Omit<EmailLog, "id" | "createdAt" | "sentAt">): Promise<EmailLog> {
    const [newLog] = await db.insert(emailLogs).values(log).returning();
    return newLog;
  }

  async updateEmailLog(id: string, status: string, error?: string): Promise<void> {
    await db.update(emailLogs).set({
      status: status as any,
      error: error || null,
      sentAt: status === "sent" ? new Date() : null,
    }).where(eq(emailLogs.id, id));
  }

  async getSettings(): Promise<AppSettings | undefined> {
    const [settings] = await db.select().from(appSettings).where(eq(appSettings.id, "singleton"));
    return settings;
  }

  async updateSettings(settings: Partial<AppSettings>): Promise<AppSettings | undefined> {
    const { id, ...rest } = settings as any;
    const [updated] = await db.update(appSettings).set({ ...rest, updatedAt: new Date() }).where(eq(appSettings.id, "singleton")).returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
