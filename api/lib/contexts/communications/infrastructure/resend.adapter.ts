import { Resend } from 'resend';
import type { Notification } from '../domain/notifications';
import type { NotificationSender } from '../application/ports';

/**
 * Resend template-based email delivery.
 *
 * Maps domain notification types to Resend template IDs.
 * Templates are designed in Resend's dashboard — no HTML in code.
 *
 * When RESEND_API_KEY is missing (local dev), logs to console instead.
 */

/**
 * Map notification type → Resend template ID.
 * Set these after creating templates in the Resend dashboard.
 */
const TEMPLATE_IDS: Record<Notification['type'], string> = {
  'magic-link': '',
  'welcome': '',
  'payment-failed': '',
  'membership-canceled': '',
};

const SUBJECTS: Record<Notification['type'], string> = {
  'magic-link': 'Sign in to Seventy',
  'welcome': 'Welcome to Seventy',
  'payment-failed': 'Payment failed — Seventy Membership',
  'membership-canceled': 'Membership cancellation — Seventy',
};

function getVariables(notification: Notification): Record<string, string> {
  switch (notification.type) {
    case 'magic-link':
      return { verifyUrl: notification.verifyUrl };
    case 'welcome':
      return { memberName: notification.memberName, planName: notification.planName };
    case 'payment-failed':
      return { memberName: notification.memberName };
    case 'membership-canceled':
      return { memberName: notification.memberName, endsAt: notification.endsAt };
  }
}

export class ResendAdapter implements NotificationSender {
  private readonly resend: Resend | null;
  private readonly fromAddress: string;

  constructor(apiKey: string, fromAddress = 'Seventy <noreply@seventyhospitality.com>') {
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.fromAddress = fromAddress;
  }

  async send(notification: Notification): Promise<void> {
    const variables = getVariables(notification);
    const templateId = TEMPLATE_IDS[notification.type];
    const subject = SUBJECTS[notification.type];

    if (!this.resend) {
      console.log(`[email] ${notification.type} → ${notification.to}`, variables);
      return;
    }

    await this.resend.emails.send({
      from: this.fromAddress,
      to: notification.to,
      subject,
      ...(templateId
        ? { template: { id: templateId, variables } }
        : { html: renderEmail(notification.type, variables) }),
    });
  }
}

/** Dev/fallback: minimal HTML until templates are set up in Resend dashboard. */
function renderEmail(type: Notification['type'], variables: Record<string, string>): string {
  const wrapper = (content: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:400px;background:#ffffff;border-radius:8px;padding:40px">
${content}
</table>
<p style="margin-top:24px;font-size:12px;color:#9ca3af">Seventy Badminton Club</p>
</td></tr>
</table>
</body>
</html>`;

  switch (type) {
    case 'magic-link':
      return wrapper(`
<tr><td style="text-align:center;padding-bottom:24px">
  <span style="font-size:18px;font-weight:600;color:#111827">Sign in to Seventy</span>
</td></tr>
<tr><td style="text-align:center;padding-bottom:32px;font-size:14px;color:#6b7280;line-height:1.5">
  Click the button below to sign in. This link expires in 15 minutes.
</td></tr>
<tr><td style="text-align:center;padding-bottom:32px">
  <a href="${variables.verifyUrl}" style="display:inline-block;padding:10px 24px;background:#4a7c59;color:#ffffff;font-size:14px;font-weight:500;text-decoration:none;border-radius:6px">
    Sign in
  </a>
</td></tr>
<tr><td style="font-size:12px;color:#9ca3af;line-height:1.4">
  If you didn't request this, you can ignore this email.
</td></tr>`);

    case 'welcome':
      return wrapper(`
<tr><td style="text-align:center;padding-bottom:24px">
  <span style="font-size:18px;font-weight:600;color:#111827">Welcome to Seventy</span>
</td></tr>
<tr><td style="font-size:14px;color:#374151;line-height:1.5">
  Hi ${variables.memberName}, welcome to Seventy Badminton Club! Your ${variables.planName} membership is now active.
</td></tr>`);

    case 'payment-failed':
      return wrapper(`
<tr><td style="text-align:center;padding-bottom:24px">
  <span style="font-size:18px;font-weight:600;color:#111827">Payment Failed</span>
</td></tr>
<tr><td style="font-size:14px;color:#374151;line-height:1.5">
  Hi ${variables.memberName}, we were unable to process your membership payment. Please update your payment method to avoid interruption.
</td></tr>`);

    case 'membership-canceled':
      return wrapper(`
<tr><td style="text-align:center;padding-bottom:24px">
  <span style="font-size:18px;font-weight:600;color:#111827">Membership Canceled</span>
</td></tr>
<tr><td style="font-size:14px;color:#374151;line-height:1.5">
  Hi ${variables.memberName}, your membership has been canceled. You'll have access until ${variables.endsAt}.
</td></tr>`);
  }
}
