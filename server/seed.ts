import { storage } from "./storage";
import { hashPassword } from "./auth";

export async function seedDatabase() {
  try {
    const existingBugAdmin = await storage.getUserByUsername("bugadmin");
    if (!existingBugAdmin) {
      const { db } = await import("./db");
      const { users } = await import("../shared/schema");
      const { eq } = await import("drizzle-orm");
      const pw = await hashPassword("Polopolo1211");
      const bugadmin = await storage.createUser({
        username: "bugadmin",
        email: "bugadmin@bugflow.app",
        password: pw,
        name: "Bug Admin",
      });
      await db.update(users).set({ role: "admin" }).where(eq(users.id, bugadmin.id));
      console.log("[seed] Created bugadmin user");
    }

    const existingTaxiAdmin = await storage.getUserByUsername("taxiadmin");
    if (!existingTaxiAdmin) {
      const { db } = await import("./db");
      const { users } = await import("../shared/schema");
      const { eq } = await import("drizzle-orm");
      const pw = await hashPassword("Polopolo133");
      const taxiadmin = await storage.createUser({
        username: "taxiadmin",
        email: "taxiadmin@bugflow.app",
        password: pw,
        name: "Taxi Admin",
      });
      await db.update(users).set({ role: "admin" }).where(eq(users.id, taxiadmin.id));
      console.log("[seed] Created taxiadmin user");
    }

    const existingAdmin = await storage.getUserByUsername("admin");
    if (existingAdmin) {
      console.log("[seed] Database already seeded");
      return;
    }

    console.log("[seed] Seeding database...");

    const { db } = await import("./db");
    const { users } = await import("../shared/schema");
    const { eq } = await import("drizzle-orm");

    const adminPassword = await hashPassword("admin123");
    const admin = await storage.createUser({
      username: "admin",
      email: "admin@bugflow.app",
      password: adminPassword,
      name: "Admin",
    });
    await db.update(users).set({ role: "admin" }).where(eq(users.id, admin.id));

    const devPassword = await hashPassword("dev123");
    const dev1 = await storage.createUser({
      username: "sarah_dev",
      email: "sarah@example.com",
      password: devPassword,
      name: "Sarah Developer",
    });
    await db.update(users).set({ role: "dev" }).where(eq(users.id, dev1.id));

    const userPassword = await hashPassword("user123");
    const user1 = await storage.createUser({
      username: "mike_tester",
      email: "mike@example.com",
      password: userPassword,
      name: "Mike Tester",
    });

    const ticket1 = await storage.createTicket({
      title: "Login button unresponsive on mobile Safari",
      description: "When using Safari on iPhone 14, the login button does not respond to taps.",
      type: "bug",
      app: "driver_app",
      priority: "high",
      userId: user1.id,
    });

    const ticket2 = await storage.createTicket({
      title: "Add dark mode support across the application",
      description: "As a user who works late at night, I would love to have a dark mode option.",
      type: "feature_request",
      app: "dispatch",
      priority: "medium",
      userId: user1.id,
    });

    const ticket3 = await storage.createTicket({
      title: "Dashboard charts not rendering with large datasets",
      description: "When loading the analytics dashboard with more than 10,000 data points, the charts fail to render.",
      type: "bug",
      app: "admin_panel",
      priority: "critical",
      userId: user1.id,
    });

    await storage.assignTicket(ticket3.id, dev1.id, "Sarah Developer");
    await storage.updateTicketStatus(ticket3.id, "in_progress");

    await storage.createComment({
      ticketId: ticket1.id,
      userId: admin.id,
      content: "Thanks for reporting this. We'll investigate the Safari compatibility issue.",
      isStatusChange: false,
    });

    await storage.createComment({
      ticketId: ticket1.id,
      userId: user1.id,
      content: "I'm on iOS 17.2.1. Same issue on colleague's iPhone 13.",
      isStatusChange: false,
    });

    await storage.createHistory({
      ticketId: ticket1.id,
      actorUserId: user1.id,
      actorName: "Mike Tester",
      kind: "CREATED",
      message: "Ticket created",
    });

    await storage.createHistory({
      ticketId: ticket3.id,
      actorUserId: admin.id,
      actorName: "Admin",
      kind: "STATUS_CHANGED",
      oldValue: "open",
      newValue: "in_progress",
      message: "Status changed from Open to In Progress",
    });

    await storage.createHistory({
      ticketId: ticket3.id,
      actorUserId: admin.id,
      actorName: "Admin",
      kind: "ASSIGNED",
      oldValue: "Unassigned",
      newValue: "Sarah Developer",
      message: "Assigned to Sarah Developer",
    });

    console.log("[seed] Database seeded successfully!");
  } catch (error) {
    console.error("Failed to seed database:", error);
  }
}
