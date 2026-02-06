// SendGrid integration for email notifications
import sgMail from '@sendgrid/mail';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=sendgrid',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key || !connectionSettings.settings.from_email)) {
    throw new Error('SendGrid not connected');
  }
  return { apiKey: connectionSettings.settings.api_key, email: connectionSettings.settings.from_email };
}

async function getUncachableSendGridClient() {
  const { apiKey, email } = await getCredentials();
  sgMail.setApiKey(apiKey);
  return {
    client: sgMail,
    fromEmail: email
  };
}

const statusLabels: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  under_review: "Under Review",
  resolved: "Resolved",
  closed: "Closed",
};

export async function sendStatusUpdateEmail(
  toEmail: string,
  username: string,
  ticketTitle: string,
  oldStatus: string,
  newStatus: string
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableSendGridClient();

    const oldLabel = statusLabels[oldStatus] || oldStatus;
    const newLabel = statusLabels[newStatus] || newStatus;

    const msg = {
      to: toEmail,
      from: fromEmail,
      subject: `[BugFlow] Ticket Update: "${ticketTitle}" - ${newLabel}`,
      text: `Hi ${username},\n\nYour ticket "${ticketTitle}" has been updated.\n\nStatus changed: ${oldLabel} → ${newLabel}\n\nLog in to BugFlow to view the full details and any comments.\n\nBest regards,\nThe BugFlow Team`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #2563eb; color: white; padding: 20px 24px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0; font-size: 18px;">BugFlow - Ticket Update</h2>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
            <p style="margin: 0 0 16px; color: #334155;">Hi <strong>${username}</strong>,</p>
            <p style="margin: 0 0 16px; color: #334155;">Your ticket has been updated:</p>
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin-bottom: 16px;">
              <p style="margin: 0 0 8px; font-weight: 600; color: #1e293b;">${ticketTitle}</p>
              <p style="margin: 0; color: #64748b; font-size: 14px;">
                Status: <span style="text-decoration: line-through; color: #94a3b8;">${oldLabel}</span>
                &nbsp;→&nbsp;
                <span style="color: #2563eb; font-weight: 600;">${newLabel}</span>
              </p>
            </div>
            <p style="margin: 0; color: #64748b; font-size: 13px;">Log in to BugFlow to view the full details and any comments.</p>
          </div>
          <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 16px;">
            This is an automated notification from BugFlow.
          </p>
        </div>
      `,
    };

    await client.send(msg);
    console.log(`[Email] Status update sent to ${toEmail} for ticket "${ticketTitle}"`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send status update email:", error);
    return false;
  }
}
