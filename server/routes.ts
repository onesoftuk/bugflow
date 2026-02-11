import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import passport from "passport";
import multer from "multer";
import path from "path";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import {
  registerSchema, loginSchema, insertTicketSchema, updateTicketStatusSchema,
  insertCommentSchema, assignTicketSchema, updateUserRoleSchema, updateSettingsSchema,
  STATUS_LABELS,
} from "@shared/schema";
import { z } from "zod";
import { sendTicketEmail } from "./email";

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only PNG, JPG, and WebP images are allowed"));
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || req.user?.role !== "admin") return res.status(403).json({ message: "Admin access required" });
  next();
}

function requireAdminOrDev(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || (req.user?.role !== "admin" && req.user?.role !== "dev")) return res.status(403).json({ message: "Admin or dev access required" });
  next();
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  setupAuth(app);

  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      const existingUsername = await storage.getUserByUsername(data.username);
      if (existingUsername) return res.status(400).json({ message: "Username already taken" });
      const existingEmail = await storage.getUserByEmail(data.email);
      if (existingEmail) return res.status(400).json({ message: "Email already registered" });
      const hashedPassword = await hashPassword(data.password);
      const user = await storage.createUser({ username: data.username, email: data.email, password: hashedPassword, name: data.name });
      req.login(user, (err) => {
        if (err) return res.status(500).json({ message: "Login failed after registration" });
        const { password, ...safeUser } = user;
        return res.status(201).json(safeUser);
      });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message });
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
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const { password, ...safeUser } = req.user!;
    res.json(safeUser);
  });

  app.get("/api/tickets", requireAuth, async (req, res) => {
    try {
      const userTickets = await storage.getTicketsByUserId(req.user!.id);
      res.json(userTickets);
    } catch { res.status(500).json({ message: "Failed to fetch tickets" }); }
  });

  app.get("/api/tickets/assigned", requireAdminOrDev, async (req, res) => {
    try {
      const assigned = await storage.getTicketsAssignedToUserId(req.user!.id);
      res.json(assigned);
    } catch { res.status(500).json({ message: "Failed to fetch assigned tickets" }); }
  });

  app.get("/api/tickets/:id", requireAuth, async (req, res) => {
    try {
      const ticket = await storage.getTicketById(req.params.id);
      if (!ticket) return res.status(404).json({ message: "Ticket not found" });
      if (ticket.userId !== req.user!.id && req.user!.role !== "admin" && req.user!.role !== "dev") {
        return res.status(403).json({ message: "Not authorized" });
      }
      if (req.user!.role === "dev" && ticket.userId !== req.user!.id && ticket.assignedToUserId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      res.json(ticket);
    } catch { res.status(500).json({ message: "Failed to fetch ticket" }); }
  });

  app.post("/api/tickets", requireAuth, async (req, res) => {
    try {
      const data = insertTicketSchema.parse(req.body);
      const ticket = await storage.createTicket({ ...data, userId: req.user!.id });
      await storage.createHistory({
        ticketId: ticket.id,
        actorUserId: req.user!.id,
        actorName: req.user!.username,
        kind: "CREATED",
        message: `Ticket created: ${ticket.title}`,
      });
      try {
        await sendTicketEmail("created", ticket, req.user!);
      } catch {}
      res.status(201).json(ticket);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message });
      res.status(500).json({ message: "Failed to create ticket" });
    }
  });

  app.patch("/api/tickets/:id/status", requireAdminOrDev, async (req, res) => {
    try {
      const data = updateTicketStatusSchema.parse(req.body);
      const ticket = await storage.getTicketById(req.params.id);
      if (!ticket) return res.status(404).json({ message: "Ticket not found" });
      if (req.user!.role === "dev" && ticket.assignedToUserId !== req.user!.id) {
        return res.status(403).json({ message: "Can only update tickets assigned to you" });
      }
      const oldStatus = ticket.status;
      const updated = await storage.updateTicketStatus(req.params.id, data.status);
      if (data.comment) {
        await storage.createComment({ ticketId: req.params.id, userId: req.user!.id, content: data.comment, isStatusChange: true });
      }
      await storage.createHistory({
        ticketId: req.params.id,
        actorUserId: req.user!.id,
        actorName: req.user!.username,
        kind: "STATUS_CHANGED",
        oldValue: oldStatus,
        newValue: data.status,
        message: `Status changed from ${STATUS_LABELS[oldStatus]} to ${STATUS_LABELS[data.status]}`,
      });
      try {
        const ticketOwner = await storage.getUser(ticket.userId);
        if (ticketOwner) {
          await sendTicketEmail("status_changed", { ...ticket, status: data.status }, ticketOwner, {
            oldStatus, newStatus: data.status, changedBy: req.user!.username,
          });
        }
      } catch {}
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message });
      res.status(500).json({ message: "Failed to update ticket status" });
    }
  });

  app.patch("/api/tickets/:id/assign", requireAdmin, async (req, res) => {
    try {
      const data = assignTicketSchema.parse(req.body);
      const ticket = await storage.getTicketById(req.params.id);
      if (!ticket) return res.status(404).json({ message: "Ticket not found" });
      let assignedName: string | null = null;
      if (data.assignedToUserId) {
        const assignedUser = await storage.getUser(data.assignedToUserId);
        if (!assignedUser) return res.status(404).json({ message: "User not found" });
        assignedName = assignedUser.name || assignedUser.username;
      }
      const updated = await storage.assignTicket(req.params.id, data.assignedToUserId, assignedName);
      await storage.createHistory({
        ticketId: req.params.id,
        actorUserId: req.user!.id,
        actorName: req.user!.username,
        kind: "ASSIGNED",
        oldValue: ticket.assignedToName || "Unassigned",
        newValue: assignedName || "Unassigned",
        message: `Assigned to ${assignedName || "nobody"}`,
      });
      try {
        const ticketOwner = await storage.getUser(ticket.userId);
        if (ticketOwner) {
          await sendTicketEmail("assigned", ticket, ticketOwner, { assignedTo: assignedName, changedBy: req.user!.username });
        }
      } catch {}
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message });
      res.status(500).json({ message: "Failed to assign ticket" });
    }
  });

  app.get("/api/tickets/:id/comments", requireAuth, async (req, res) => {
    try {
      const ticket = await storage.getTicketById(req.params.id);
      if (!ticket) return res.status(404).json({ message: "Ticket not found" });
      const allComments = await storage.getCommentsByTicketId(req.params.id);
      const isAdminOrDev = req.user!.role === "admin" || req.user!.role === "dev";
      const filtered = isAdminOrDev ? allComments : allComments.filter(c => !c.isInternal);
      res.json(filtered);
    } catch { res.status(500).json({ message: "Failed to fetch comments" }); }
  });

  app.post("/api/tickets/:id/comments", requireAuth, async (req, res) => {
    try {
      const data = insertCommentSchema.parse({ ...req.body, ticketId: req.params.id });
      const ticket = await storage.getTicketById(req.params.id);
      if (!ticket) return res.status(404).json({ message: "Ticket not found" });
      if (data.isInternal && req.user!.role !== "admin" && req.user!.role !== "dev") {
        return res.status(403).json({ message: "Only admin/dev can add internal notes" });
      }
      const comment = await storage.createComment({ ticketId: req.params.id, userId: req.user!.id, content: data.content, isInternal: data.isInternal });
      await storage.createHistory({
        ticketId: req.params.id,
        actorUserId: req.user!.id,
        actorName: req.user!.username,
        kind: data.isInternal ? "INTERNAL_NOTE" : "PUBLIC_NOTE",
        message: `${data.isInternal ? "Internal" : "Public"} note added by ${req.user!.username}`,
      });
      try {
        const ticketOwner = await storage.getUser(ticket.userId);
        if (ticketOwner && !data.isInternal) {
          await sendTicketEmail("note_added", ticket, ticketOwner, { note: data.content, addedBy: req.user!.username });
        }
      } catch {}
      res.status(201).json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message });
      res.status(500).json({ message: "Failed to add comment" });
    }
  });

  app.get("/api/tickets/:id/attachments", requireAuth, async (req, res) => {
    try {
      const atts = await storage.getAttachmentsByTicketId(req.params.id);
      const safeAtts = atts.map(({ fileData, ...rest }) => rest);
      res.json(safeAtts);
    } catch { res.status(500).json({ message: "Failed to fetch attachments" }); }
  });

  app.post("/api/tickets/:id/attachments", requireAuth, upload.array("files", 10), async (req, res) => {
    try {
      const ticket = await storage.getTicketById(req.params.id);
      if (!ticket) return res.status(404).json({ message: "Ticket not found" });
      const existing = await storage.getAttachmentsByTicketId(req.params.id);
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) return res.status(400).json({ message: "No files uploaded" });
      if (existing.length + files.length > 10) return res.status(400).json({ message: "Max 10 attachments per ticket" });
      const results = [];
      for (const file of files) {
        const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`;
        const fileData = file.buffer.toString("base64");
        const att = await storage.createAttachment({
          ticketId: req.params.id,
          originalName: file.originalname,
          filename: uniqueName,
          mimeType: file.mimetype,
          size: file.size,
          fileData,
          uploadedByUserId: req.user!.id,
        });
        const { fileData: _, ...safeAtt } = att;
        results.push(safeAtt);
      }
      await storage.createHistory({
        ticketId: req.params.id,
        actorUserId: req.user!.id,
        actorName: req.user!.username,
        kind: "ATTACHMENT_ADDED",
        message: `${files.length} attachment(s) added`,
      });
      res.status(201).json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to upload" });
    }
  });

  app.get("/api/attachments/:id/download", requireAuth, async (req, res) => {
    try {
      const att = await storage.getAttachmentById(req.params.id);
      if (!att) return res.status(404).json({ message: "Attachment not found" });
      if (!att.fileData) return res.status(404).json({ message: "File data not found" });
      const buffer = Buffer.from(att.fileData, "base64");
      res.setHeader("Content-Type", att.mimeType);
      res.setHeader("Content-Disposition", `inline; filename="${att.originalName}"`);
      res.setHeader("Content-Length", buffer.length.toString());
      res.send(buffer);
    } catch { res.status(500).json({ message: "Failed to download" }); }
  });

  app.get("/api/tickets/:id/history", requireAuth, async (req, res) => {
    try {
      const history = await storage.getHistoryByTicketId(req.params.id);
      const isAdminOrDev = req.user!.role === "admin" || req.user!.role === "dev";
      const filtered = isAdminOrDev ? history : history.filter(h => h.kind !== "INTERNAL_NOTE");
      res.json(filtered);
    } catch { res.status(500).json({ message: "Failed to fetch history" }); }
  });

  app.get("/api/admin/tickets", requireAdminOrDev, async (req, res) => {
    try {
      const allTickets = await storage.getAllTickets();
      if (req.user!.role === "dev") {
        const devTickets = allTickets.filter(t => t.assignedToUserId === req.user!.id);
        return res.json(devTickets);
      }
      res.json(allTickets);
    } catch { res.status(500).json({ message: "Failed to fetch tickets" }); }
  });

  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const safeUsers = allUsers.map(({ password, ...u }) => u);
      res.json(safeUsers);
    } catch { res.status(500).json({ message: "Failed to fetch users" }); }
  });

  app.get("/api/admin/devs", requireAdminOrDev, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const devs = allUsers.filter(u => u.role === "dev" || u.role === "admin").map(({ password, ...u }) => u);
      res.json(devs);
    } catch { res.status(500).json({ message: "Failed to fetch devs" }); }
  });

  app.patch("/api/admin/users/:id/role", requireAdmin, async (req, res) => {
    try {
      const data = updateUserRoleSchema.parse(req.body);
      const updated = await storage.updateUserRole(req.params.id, data.role);
      if (!updated) return res.status(404).json({ message: "User not found" });
      const { password, ...safeUser } = updated;
      res.json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message });
      res.status(500).json({ message: "Failed to update role" });
    }
  });

  app.patch("/api/admin/users/:id/active", requireAdmin, async (req, res) => {
    try {
      const { isActive } = req.body;
      const updated = await storage.updateUserActive(req.params.id, isActive);
      if (!updated) return res.status(404).json({ message: "User not found" });
      const { password, ...safeUser } = updated;
      res.json(safeUser);
    } catch { res.status(500).json({ message: "Failed to update user" }); }
  });

  app.get("/api/admin/settings", requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getSettings();
      if (settings) {
        const { smtpPass, ...safe } = settings;
        res.json({ ...safe, smtpPass: smtpPass ? "********" : "" });
      } else {
        res.json(null);
      }
    } catch { res.status(500).json({ message: "Failed to fetch settings" }); }
  });

  app.put("/api/admin/settings", requireAdmin, async (req, res) => {
    try {
      const data = updateSettingsSchema.parse(req.body);
      const current = await storage.getSettings();
      const updateData: any = { ...data };
      if (updateData.smtpPass === "********" && current) {
        updateData.smtpPass = current.smtpPass;
      }
      const updated = await storage.updateSettings(updateData);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0].message });
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  app.post("/api/admin/settings/test-email", requireAdmin, async (req, res) => {
    try {
      const result = await sendTicketEmail("test", null as any, req.user!, {});
      res.json({ success: result });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Test email failed" });
    }
  });

  app.get("/api/admin/email-logs", requireAdmin, async (req, res) => {
    try {
      const logs = await storage.getEmailLogs();
      res.json(logs);
    } catch { res.status(500).json({ message: "Failed to fetch email logs" }); }
  });

  return httpServer;
}
