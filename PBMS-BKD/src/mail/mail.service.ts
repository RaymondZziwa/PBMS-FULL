import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { readFile } from 'fs/promises';
import { createHash } from 'crypto';
import * as path from 'path';
import * as Handlebars from 'handlebars';

const RESEND_API_URL = 'https://api.resend.com/emails';

type TemplateName =
  | 'welcome'
  | 'email-verification'
  | 'email-verified'
  | 'forgot-pwd';

type SendOptions = {
  to: string;
  subject: string;
  template: TemplateName;
  variables: Record<string, unknown>;
  /** Stops Resend sending the same email twice if a request is retried (24 h window). */
  idempotencyKey?: string;
};

/**
 * Sends PBMS emails through Resend (https://resend.com).
 *
 * Needs in .env:
 *   RESEND_API_KEY=re_...
 *   RESEND_FROM="Prof Bioresearch <no-reply@your-verified-domain>"
 * The sender's domain must be verified in the Resend dashboard.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly templates = new Map<TemplateName, Handlebars.TemplateDelegate>();

  constructor(
    private readonly config: ConfigService,
    private readonly http: HttpService,
  ) {}

  /** Welcome email for a new employee, optionally with a one-time code. */
  async sendOnRegistration(firstName: string, lastName: string, email: string, otp?: string) {
    await this.send({
      to: email,
      subject: 'Welcome to Prof Bioresearch',
      template: 'welcome',
      variables: { firstName, lastName, otp },
    });
  }

  async sendOnEmailVerification(firstName: string, lastName: string, email: string, code: string) {
    await this.send({
      to: email,
      subject: 'Verify your Prof Bioresearch email',
      template: 'email-verification',
      variables: { firstName, lastName, code },
    });
  }

  async sendOnForgotPassword(name: string, email: string, code: string) {
    await this.send({
      to: email,
      subject: 'Your PBMS password reset code',
      template: 'forgot-pwd',
      variables: { name, code },
      // One email per code, even if the request is retried.
      idempotencyKey: `pwd-reset/${createHash('sha256').update(`${email}:${code}`).digest('hex')}`,
    });
  }

  async sendOnAccountVerification(firstName: string, lastName: string, email: string) {
    await this.send({
      to: email,
      subject: 'Your Prof Bioresearch account is active',
      template: 'email-verified',
      variables: { firstName, lastName },
    });
  }

  /** Sends ready-made HTML (used by the Monk Loyalty Club notices). */
  async sendHtml(to: string, subject: string, html: string, idempotencyKey?: string) {
    await this.deliver(to, subject, html, subject, idempotencyKey);
  }

  private async send({ to, subject, template, variables, idempotencyKey }: SendOptions) {
    const html = await this.render(template, { ...variables, year: new Date().getFullYear() });
    await this.deliver(to, subject, html, template, idempotencyKey);
  }

  private async deliver(to: string, subject: string, html: string, template: string, idempotencyKey?: string) {
    const apiKey = this.config.getOrThrow<string>('RESEND_API_KEY');
    const from = this.config.getOrThrow<string>('RESEND_FROM');

    try {
      const res = await firstValueFrom(
        this.http.post<{ id: string }>(
          RESEND_API_URL,
          { from, to: [to], subject, html },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey.slice(0, 256) } : {}),
            },
            timeout: 10000,
          },
        ),
      );
      this.logger.log(`Email "${template}" accepted by Resend (id ${res.data?.id})`);
    } catch (error) {
      // Resend returns { name, message } on errors; never log the API key or the email body.
      const detail = isAxiosError(error)
        ? `${error.response?.status ?? 'no response'} ${JSON.stringify(error.response?.data ?? error.message)}`
        : String(error);
      this.logger.error(`Resend failed to send "${template}": ${detail}`);
      throw new Error(`Failed to send "${template}" email`);
    }
  }

  private async render(name: TemplateName, variables: Record<string, unknown>): Promise<string> {
    let compiled = this.templates.get(name);
    if (!compiled) {
      const file = path.join(__dirname, 'templates', `${name}.hbs`);
      compiled = Handlebars.compile(await readFile(file, 'utf-8'));
      this.templates.set(name, compiled);
    }
    return compiled(variables);
  }
}
