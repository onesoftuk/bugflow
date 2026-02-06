import { eq, desc } from "drizzle-orm";
import { db } from "./db";
import {
  users, tickets, comments,
  type User, type InsertUser, type Ticket, type InsertTicket, type Comment, type InsertComment,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getTicketsByUserId(userId: string): Promise<Ticket[]>;
  getAllTickets(): Promise<(Ticket & { user: { username: string; email: string } })[]>;
  getTicketById(id: string): Promise<Ticket | undefined>;
  createTicket(ticket: InsertTicket & { userId: string }): Promise<Ticket>;
  updateTicketStatus(id: string, status: string): Promise<Ticket | undefined>;

  getCommentsByTicketId(ticketId: string): Promise<(Comment & { user: { username: string; role: string } })[]>;
  createComment(comment: InsertComment & { userId: string; isStatusChange?: boolean }): Promise<Comment>;
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getTicketsByUserId(userId: string): Promise<Ticket[]> {
    return db.select().from(tickets).where(eq(tickets.userId, userId)).orderBy(desc(tickets.createdAt));
  }

  async getAllTickets(): Promise<(Ticket & { user: { username: string; email: string } })[]> {
    const result = await db
      .select({
        id: tickets.id,
        title: tickets.title,
        description: tickets.description,
        type: tickets.type,
        status: tickets.status,
        priority: tickets.priority,
        userId: tickets.userId,
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
      status: r.status,
      priority: r.priority,
      userId: r.userId,
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

  async getCommentsByTicketId(ticketId: string): Promise<(Comment & { user: { username: string; role: string } })[]> {
    const result = await db
      .select({
        id: comments.id,
        ticketId: comments.ticketId,
        userId: comments.userId,
        content: comments.content,
        isStatusChange: comments.isStatusChange,
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
      })
      .returning();
    return newComment;
  }
}

export const storage = new DatabaseStorage();
