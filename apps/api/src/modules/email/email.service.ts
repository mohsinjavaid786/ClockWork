import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { inviteEmail, resetEmail } from './email.templates';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;

  constructor() {
    const apiKey = process.env['RESEND_API_KEY'];
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.from = process.env['RESEND_FROM'] ?? 'Clockwork <onboarding@resend.dev>';
    if (!this.resend) {
      this.logger.warn('RESEND_API_KEY not set — emails are logged, not sent.');
    }
  }

  /** Public installer download URLs, derived from SUPABASE_URL unless overridden. */
  private downloadUrls(): { mac: string; win: string } {
    const base = (process.env['SUPABASE_URL'] ?? '').replace(/\/$/, '');
    const bucket = process.env['DOWNLOAD_BUCKET'] ?? 'installers';
    const fallback = (file: string) =>
      base ? `${base}/storage/v1/object/public/${bucket}/latest/${file}` : '#';
    return {
      mac: process.env['DOWNLOAD_URL_MACOS'] ?? fallback('Clockwork.dmg'),
      win: process.env['DOWNLOAD_URL_WINDOWS'] ?? fallback('Clockwork.exe'),
    };
  }

  private companyName(): string {
    return process.env['COMPANY_NAME'] ?? 'your team';
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.resend) {
      this.logger.log(`[email suppressed: no RESEND_API_KEY] to=${to} subject="${subject}"`);
      return;
    }
    const { error } = await this.resend.emails.send({ from: this.from, to, subject, html });
    if (error) {
      this.logger.error(`Resend failed for ${to}: ${error.message}`);
      throw new Error(error.message);
    }
    this.logger.log(`Email sent to ${to}: "${subject}"`);
  }

  async sendInvite(to: string, name: string, actionLink: string | null): Promise<void> {
    const { mac, win } = this.downloadUrls();
    const html = inviteEmail({
      name,
      actionLink,
      macUrl: mac,
      winUrl: win,
      companyName: this.companyName(),
    });
    await this.send(to, "You're invited to Clockwork", html);
  }

  async sendPasswordReset(to: string, actionLink: string): Promise<void> {
    const html = resetEmail({ actionLink, companyName: this.companyName() });
    await this.send(to, 'Reset your Clockwork password', html);
  }
}
