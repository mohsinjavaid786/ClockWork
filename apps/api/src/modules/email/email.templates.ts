// Plain, email-client-safe HTML (table layout, inline styles). No external CSS.

interface InviteParams {
  name: string;
  actionLink: string;
  macUrl: string;
  winUrl: string;
  companyName: string;
}

interface ResetParams {
  actionLink: string;
  companyName: string;
}

function layout(title: string, bodyInner: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:480px;max-width:92%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
            <tr>
              <td style="background:#0A0A0A;padding:24px 32px;">
                <span style="color:#ffffff;font-size:18px;font-weight:600;letter-spacing:0.5px;">CLOCKWORK</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">${title}</h1>
                ${bodyInner}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;border-top:1px solid #e4e4e7;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">Sent by Clockwork. If you weren't expecting this email, you can safely ignore it.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
    <tr><td style="border-radius:8px;background:#111827;">
      <a href="${href}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${label}</a>
    </td></tr>
  </table>`;
}

export function inviteEmail(p: InviteParams): string {
  const inner = `
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#374151;">
      Hi ${escapeHtml(p.name)}, you've been invited to join <strong>${escapeHtml(p.companyName)}</strong> on Clockwork — the team time-tracking app.
    </p>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#374151;"><strong>Step 1 — Set your password</strong></p>
    ${button(p.actionLink, 'Set your password')}
    <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#374151;"><strong>Step 2 — Download the desktop app</strong></p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#374151;">Install Clockwork on your computer, then sign in with the email this was sent to.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
      <tr>
        <td style="padding-right:10px;"><a href="${p.macUrl}" style="display:inline-block;padding:10px 18px;font-size:13px;font-weight:600;color:#111827;text-decoration:none;border:1px solid #d1d5db;border-radius:8px;">Download for macOS</a></td>
        <td><a href="${p.winUrl}" style="display:inline-block;padding:10px 18px;font-size:13px;font-weight:600;color:#111827;text-decoration:none;border:1px solid #d1d5db;border-radius:8px;">Download for Windows</a></td>
      </tr>
    </table>
    <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#9ca3af;">The "Set your password" link expires after a while. If it stops working, ask your admin to re-send the invite.</p>`;
  return layout("You're invited to Clockwork", inner);
}

export function resetEmail(p: ResetParams): string {
  const inner = `
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#374151;">
      We received a request to reset your Clockwork password. Click below to choose a new one.
    </p>
    ${button(p.actionLink, 'Reset password')}
    <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;">This link expires after a while. If you didn't request a reset, ignore this email — your password won't change.</p>`;
  return layout('Reset your password', inner);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
}
