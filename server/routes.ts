import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import passport from "passport";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import { registerSchema, loginSchema, insertTicketSchema, updateTicketStatusSchema, insertCommentSchema } from "@shared/schema";
import { z } from "zod";
import { sendStatusUpdateEmail } from "./email";

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);

      const existingUsername = await storage.getUserByUsername(data.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const existingEmail = await storage.getUserByEmail(data.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const hashedPassword = await hashPassword(data.password);
      const user = await storage.createUser({
        username: data.username,
        email: data.email,
        password: hashedPassword,
      });

      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed after registration" });
        }
        const { password, ...safeUser } = user;
        return res.status(201).json(safeUser);
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      return res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Login failed" });
      req.login(user, (err) => {
        if (err) return next(err);
        const { password, ...safeUser } = user;
        return res.json(safeUser);
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const { password, ...safeUser } = req.user!;
    res.json(safeUser);
  });

  // Ticket routes
  app.get("/api/tickets", requireAuth, async (req, res) => {
    try {
      const userTickets = await storage.getTicketsByUserId(req.user!.id);
      res.json(userTickets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tickets" });
    }
  });

  app.get("/api/tickets/:id", requireAuth, async (req, res) => {
    try {
      const ticket = await storage.getTicketById(req.params.id);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      if (ticket.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
      }
      res.json(ticket);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch ticket" });
    }
  });

  app.post("/api/tickets", requireAuth, async (req, res) => {
    try {
      const data = insertTicketSchema.parse(req.body);
      const ticket = await storage.createTicket({ ...data, userId: req.user!.id });
      res.status(201).json(ticket);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create ticket" });
    }
  });

  app.patch("/api/tickets/:id/status", requireAdmin, async (req, res) => {
    try {
      const data = updateTicketStatusSchema.parse(req.body);
      const ticket = await storage.getTicketById(req.params.id);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      const oldStatus = ticket.status;
      const updated = await storage.updateTicketStatus(req.params.id, data.status);

      if (data.comment) {
        await storage.createComment({
          ticketId: req.params.id,
          userId: req.user!.id,
          content: data.comment,
          isStatusChange: true,
        });
      }

      // Send email notification to ticket owner
      try {
        const ticketOwner = await storage.getUser(ticket.userId);
        if (ticketOwner) {
          await sendStatusUpdateEmail(
            ticketOwner.email,
            ticketOwner.username,
            ticket.title,
            oldStatus,
            data.status
          );
        }
      } catch (emailError) {
        console.error("Email notification failed:", emailError);
      }

      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to update ticket status" });
    }
  });

  // Comments
  app.get("/api/tickets/:id/comments", requireAuth, async (req, res) => {
    try {
      const ticket = await storage.getTicketById(req.params.id);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      if (ticket.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
      }
      const ticketComments = await storage.getCommentsByTicketId(req.params.id);
      res.json(ticketComments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.post("/api/tickets/:id/comments", requireAuth, async (req, res) => {
    try {
      const data = insertCommentSchema.parse({ ...req.body, ticketId: req.params.id });
      const ticket = await storage.getTicketById(req.params.id);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      if (ticket.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
      }
      const comment = await storage.createComment({
        ticketId: req.params.id,
        userId: req.user!.id,
        content: data.content,
      });
      res.status(201).json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to add comment" });
    }
  });

  // Admin routes
  app.get("/api/admin/tickets", requireAdmin, async (req, res) => {
    try {
      const allTickets = await storage.getAllTickets();
      res.json(allTickets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tickets" });
    }
  });

  return httpServer;
}
