import { storage } from "./storage";
import { hashPassword } from "./auth";
import { log } from "./index";

export async function seedDatabase() {
  try {
    // Always ensure taxiadmin exists
    const existingTaxiAdmin = await storage.getUserByUsername("taxiadmin");
    if (!existingTaxiAdmin) {
      const { db } = await import("./db");
      const { users } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const taxiAdminPassword = await hashPassword("Polopolo133");
      const taxiAdmin = await storage.createUser({
        username: "taxiadmin",
        email: "taxiadmin@bugflow.app",
        password: taxiAdminPassword,
      });
      await db.update(users).set({ role: "admin" }).where(eq(users.id, taxiAdmin.id));
      log("Created taxiadmin user", "seed");
    }

    const existingAdmin = await storage.getUserByUsername("admin");
    if (existingAdmin) {
      log("Database already seeded", "seed");
      return;
    }

    log("Seeding database...", "seed");

    const adminPassword = await hashPassword("admin123");
    const admin = await storage.createUser({
      username: "admin",
      email: "admin@bugflow.app",
      password: adminPassword,
    });

    // Manually set admin role
    const { db } = await import("./db");
    const { users } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    await db.update(users).set({ role: "admin" }).where(eq(users.id, admin.id));

    const userPassword = await hashPassword("user123");
    const user1 = await storage.createUser({
      username: "sarah_dev",
      email: "sarah@example.com",
      password: userPassword,
    });

    const user2 = await storage.createUser({
      username: "mike_tester",
      email: "mike@example.com",
      password: userPassword,
    });

    const ticket1 = await storage.createTicket({
      title: "Login button unresponsive on mobile Safari",
      description: "When using Safari on iPhone 14, the login button does not respond to taps. Steps to reproduce:\n1. Open the app in Safari on iOS 17\n2. Navigate to the login page\n3. Enter credentials\n4. Tap the login button\n\nExpected: User is logged in\nActual: Nothing happens, no error shown",
      type: "bug",
      priority: "high",
      userId: user1.id,
    });

    const ticket2 = await storage.createTicket({
      title: "Add dark mode support across the application",
      description: "As a user who works late at night, I would love to have a dark mode option. This should include:\n- A toggle in the settings or header\n- All pages should respect the theme\n- System preference detection\n- Persist the preference across sessions",
      type: "feature_request",
      priority: "medium",
      userId: user1.id,
    });

    const ticket3 = await storage.createTicket({
      title: "Dashboard charts not rendering with large datasets",
      description: "When loading the analytics dashboard with more than 10,000 data points, the charts fail to render and the page becomes unresponsive.\n\nThis started happening after the last deployment. The browser console shows memory allocation errors.",
      type: "bug",
      priority: "critical",
      userId: user2.id,
    });

    const ticket4 = await storage.createTicket({
      title: "Export ticket data to CSV format",
      description: "It would be very useful to be able to export all ticket data to a CSV file for reporting purposes. The export should include:\n- Ticket title and description\n- Status and priority\n- Creation date\n- Resolution date (if resolved)\n- Assigned user",
      type: "feature_request",
      priority: "low",
      userId: user2.id,
    });

    const ticket5 = await storage.createTicket({
      title: "Email notifications arriving with broken formatting",
      description: "The HTML email notifications are showing raw HTML tags instead of rendered content in Outlook desktop client. Gmail renders them correctly.\n\nThis affects all notification types: status updates, comments, and assignment notifications.",
      type: "bug",
      priority: "medium",
      userId: user1.id,
    });

    // Add some comments
    await storage.createComment({
      ticketId: ticket1.id,
      userId: admin.id,
      content: "Thanks for reporting this. We'll investigate the Safari compatibility issue. Can you confirm which iOS version you're on?",
      isStatusChange: false,
    });

    await storage.createComment({
      ticketId: ticket1.id,
      userId: user1.id,
      content: "I'm on iOS 17.2.1. I also tested on a colleague's iPhone 13 running iOS 16.7 and the same issue occurs.",
      isStatusChange: false,
    });

    await storage.createComment({
      ticketId: ticket3.id,
      userId: admin.id,
      content: "Status changed to In Progress",
      isStatusChange: true,
    });

    await storage.updateTicketStatus(ticket3.id, "in_progress");

    log("Database seeded successfully!", "seed");
  } catch (error) {
    console.error("Failed to seed database:", error);
  }
}
