import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { MailService } from 'src/mail/mail.service';

type Notice = {
  /** Email subject (also the SMS opener). */
  subject: string;
  /** Short paragraphs; the SMS joins them with spaces. */
  lines: string[];
  /** Highlighted values, e.g. { 'Card number': 'PBMC-26-000123', 'Temporary password': '…' }. */
  facts?: Record<string, string>;
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/**
 * Tells members what happened to their application: by email when they gave
 * one, otherwise by SMS. Failures are logged, never thrown: an approval must
 * not fail because a message couldn't be sent.
 *
 * SMS uses the same gateway as password resets (SMS_URL, SMS_SECRET in .env).
 * Until those are set, messages are logged and `sent` comes back false.
 */
@Injectable()
export class ClubNotifyService {
  private readonly logger = new Logger(ClubNotifyService.name);

  constructor(
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly http: HttpService,
  ) {}

  async notify(to: { email?: string | null; phone1: string; firstName: string }, notice: Notice): Promise<{ channel: 'email' | 'sms'; sent: boolean }> {
    if (to.email) {
      try {
        await this.mail.sendHtml(to.email, notice.subject, this.html(to.firstName, notice));
        return { channel: 'email', sent: true };
      } catch (e) {
        this.logger.warn(`Club email to member failed (${(e as Error).message}); trying SMS`);
      }
    }
    const sent = await this.sms(to.phone1, this.text(to.firstName, notice));
    return { channel: 'sms', sent };
  }

  async sms(phone: string, message: string): Promise<boolean> {
    const url = this.config.get<string>('SMS_URL');
    const secret = this.config.get<string>('SMS_SECRET');
    if (!url || !secret) {
      this.logger.warn(`SMS not configured (SMS_URL / SMS_SECRET). Message to ${phone.slice(0, 7)}… not sent.`);
      return false;
    }
    try {
      await firstValueFrom(
        this.http.post(`${url}/sms/send`, { recipients: phone, message }, { headers: { 'api-key': secret, 'Content-Type': 'application/json' }, timeout: 10000 }),
      );
      return true;
    } catch (e) {
      this.logger.error(`SMS to ${phone.slice(0, 7)}… failed: ${(e as Error).message}`);
      return false;
    }
  }

  private text(name: string, n: Notice) {
    const facts = Object.entries(n.facts ?? {}).map(([k, v]) => `${k}: ${v}`);
    return [`Monk Club: Hi ${name}.`, ...n.lines, ...facts].join(' ').slice(0, 600);
  }

  private html(name: string, n: Notice) {
    const facts = Object.entries(n.facts ?? {})
      .map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#5B6475">${esc(k)}</td><td style="padding:6px 0;font-weight:700;font-family:ui-monospace,Menlo,monospace;color:#14181F">${esc(v)}</td></tr>`)
      .join('');
    const app = this.config.get<string>('CLUB_APP_URL');
    return `<!doctype html><html><body style="margin:0;background:#F5F6FA;font-family:Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:14px;overflow:hidden">
<tr><td style="background:#1C2C57;color:#fff;padding:18px 24px;font-size:18px;font-weight:700">Monk Loyalty Club <span style="font-weight:400;opacity:.8">· Prof Bioresearch</span></td></tr>
<tr><td style="padding:24px;color:#2B3240;font-size:15px;line-height:1.55">
<p style="margin:0 0 12px">Hello ${esc(name)},</p>
${n.lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join('')}
${facts ? `<table role="presentation" style="margin:8px 0 16px;border-top:1px solid #DDE2EC;width:100%">${facts}</table>` : ''}
${app ? `<p style="margin:16px 0 0"><a href="${esc(app)}" style="display:inline-block;background:#3959A5;color:#fff;text-decoration:none;padding:11px 18px;border-radius:9px;font-weight:600">Open Monk Club</a></p>` : ''}
</td></tr>
<tr><td style="padding:14px 24px;background:#F7F8FB;color:#5B6475;font-size:12px">You received this because you applied to the Monk Loyalty Club.</td></tr>
</table></td></tr></table></body></html>`;
  }
}
