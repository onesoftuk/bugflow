import sgMail from '@sendgrid/mail';
import { storage } from "./storage";
import { STATUS_LABELS, APP_LABELS } from "../shared/schema";
import type { Ticket, User } from "../shared/schema";

let connectionSettings: any;

async function getCredentials() {
  if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
    return { apiKey: process.env.SENDGRID_API_KEY, email: process.env.SENDGRID_FROM_EMAIL };
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) throw new Error('SendGrid not configured. Set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL environment variables.');

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=sendgrid',
    { headers: { 'Accept': 'application/json', 'X_REPLIT_TOKEN': xReplitToken } }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key || !connectionSettings.settings.from_email)) {
    throw new Error('SendGrid not connected');
  }
  return { apiKey: connectionSettings.settings.api_key, email: connectionSettings.settings.from_email };
}

async function getSendGridClient() {
  const { apiKey, email } = await getCredentials();
  sgMail.setApiKey(apiKey);
  return { client: sgMail, fromEmail: email };
}

async function getAdminRecipients(): Promise<string[]> {
  try {
    const settings = await storage.getSettings();
    if (settings?.adminRecipients) {
      return settings.adminRecipients.split(",").map(e => e.trim()).filter(Boolean);
    }
  } catch {}
  return ["peter@abacusonline.net", "teambackendcoders@gmail.com"];
}

async function sendEmail(to: string[], subject: string, html: string, text: string): Promise<boolean> {
  const log = await storage.createEmailLog({
    toAddresses: to.join(","),
    subject,
    body: html,
    status: "queued",
    error: null,
  });

  try {
    const { client, fromEmail } = await getSendGridClient();
    await client.send({ to, from: fromEmail, subject, html, text });
    await storage.updateEmailLog(log.id, "sent");
    console.log(`[Email] Sent to ${to.join(", ")}: ${subject}`);
    return true;
  } catch (error: any) {
    const errMsg = error.message || "Unknown error";
    await storage.updateEmailLog(log.id, "failed", errMsg);
    console.error("[Email] Failed:", errMsg);
    return false;
  }
}

export async function sendTicketEmail(
  type: "created" | "status_changed" | "assigned" | "note_added" | "test",
  ticket: Ticket,
  user: User,
  extra?: any
): Promise<boolean> {
  try {
    const adminRecipients = await getAdminRecipients();

    if (type === "test") {
      return await sendEmail(
        [user.email],
        "[BugFlow] Test Email",
        `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <div style="background:#dc2626;color:white;padding:20px 24px;border-radius:8px 8px 0 0;">
            <h2 style="margin:0;font-size:18px;">BugFlow - Test Email</h2>
          </div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
            <p>This is a test email from BugFlow. If you received this, email notifications are working correctly.</p>
          </div>
        </div>`,
        "This is a test email from BugFlow."
      );
    }

    const appLabel = APP_LABELS[ticket.app] || ticket.app;
    const statusLabel = STATUS_LABELS[ticket.status] || ticket.status;

    if (type === "created") {
      await sendEmail(
        adminRecipients,
        `[BugFlow] New ${ticket.type === "bug" ? "Bug" : "Feature"} - ${ticket.title} (${appLabel})`,
        buildEmailHtml("New Ticket Submitted", [
          `<strong>Title:</strong> ${ticket.title}`,
          `<strong>App:</strong> ${appLabel}`,
          `<strong>Type:</strong> ${ticket.type === "bug" ? "Bug" : "Feature Request"}`,
          `<strong>Priority:</strong> ${ticket.priority}`,
          `<strong>Status:</strong> ${statusLabel}`,
          `<strong>Submitted by:</strong> ${user.username} (${user.email})`,
          `<strong>Description:</strong><br/>${ticket.description}`,
        ]),
        `New ticket: ${ticket.title} by ${user.username}`
      );
      await sendEmail(
        [user.email],
        `[BugFlow] Ticket Received: ${ticket.title}`,
        buildEmailHtml("Ticket Confirmation", [
          `<p>Your ticket has been submitted successfully.</p>`,
          `<strong>Title:</strong> ${ticket.title}`,
          `<strong>App:</strong> ${appLabel}`,
          `<strong>Status:</strong> ${statusLabel}`,
        ]),
        `Your ticket "${ticket.title}" has been submitted.`
      );
      return true;
    }

    if (type === "status_changed") {
      const oldLabel = STATUS_LABELS[extra.oldStatus] || extra.oldStatus;
      const newLabel = STATUS_LABELS[extra.newStatus] || extra.newStatus;
      await sendEmail(
        [user.email, ...adminRecipients],
        `[BugFlow] Status Update: "${ticket.title}" - ${newLabel}`,
        buildEmailHtml("Ticket Status Updated", [
          `<strong>Ticket:</strong> ${ticket.title}`,
          `<strong>App:</strong> ${appLabel}`,
          `<strong>Status:</strong> <span style="text-decoration:line-through">${oldLabel}</span> &rarr; <strong>${newLabel}</strong>`,
          `<strong>Updated by:</strong> ${extra.changedBy}`,
        ]),
        `Ticket "${ticket.title}" status changed from ${oldLabel} to ${newLabel}`
      );
      return true;
    }

    if (type === "assigned") {
      await sendEmail(
        [user.email, ...adminRecipients],
        `[BugFlow] Ticket Assigned: "${ticket.title}"`,
        buildEmailHtml("Ticket Assignment Updated", [
          `<strong>Ticket:</strong> ${ticket.title}`,
          `<strong>Assigned to:</strong> ${extra.assignedTo || "Unassigned"}`,
          `<strong>Updated by:</strong> ${extra.changedBy}`,
        ]),
        `Ticket "${ticket.title}" assigned to ${extra.assignedTo || "nobody"}`
      );
      return true;
    }

    if (type === "note_added") {
      await sendEmail(
        [user.email, ...adminRecipients],
        `[BugFlow] New Note on: "${ticket.title}"`,
        buildEmailHtml("New Note Added", [
          `<strong>Ticket:</strong> ${ticket.title}`,
          `<strong>Note by:</strong> ${extra.addedBy}`,
          `<strong>Note:</strong><br/>${extra.note}`,
        ]),
        `New note on ticket "${ticket.title}" by ${extra.addedBy}`
      );
      return true;
    }

    return false;
  } catch (error) {
    console.error("[Email] sendTicketEmail error:", error);
    return false;
  }
}

function buildEmailHtml(title: string, lines: string[]): string {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:#dc2626;color:white;padding:20px 24px;border-radius:8px 8px 0 0;">
      <h2 style="margin:0;font-size:18px;">BugFlow - ${title}</h2>
    </div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
      ${lines.map(l => `<p style="margin:0 0 12px;color:#334155;">${l}</p>`).join("")}
    </div>
    <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:16px;">Automated notification from BugFlow</p>
  </div>`;
}
