import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';

export type OrderMailPayload = {
  id: string;
  createdAt: Date;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  total: number;
  deliveryMethod?: string | null;
  deliveryCity?: string | null;
  deliveryAddress?: string | null;
  comment?: string | null;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  private notifyTo() {
    return (
      this.config.get<string>('ORDER_NOTIFY_EMAIL') ||
      'vetalstefan167@gmail.com'
    );
  }

  async sendOrderCreated(order: OrderMailPayload) {
    const to = this.notifyTo();
    const subject = `Нове замовлення Secret Garden · ${order.id}`;
    const itemsHtml = order.items
      .map(
        (i) =>
          `<li>${escapeHtml(i.name)} × ${i.quantity} — ${(
            i.price * i.quantity
          ).toLocaleString('uk-UA')} ₴</li>`,
      )
      .join('');

    const html = `
      <h2>Нове замовлення</h2>
      <p><b>ID:</b> ${escapeHtml(order.id)}</p>
      <p><b>Дата:</b> ${new Date(order.createdAt).toLocaleString('uk-UA')}</p>
      <p><b>Клієнт:</b> ${escapeHtml(order.firstName)} ${escapeHtml(order.lastName)}</p>
      <p><b>Телефон:</b> ${escapeHtml(order.phone)}</p>
      <p><b>Email:</b> ${escapeHtml(order.email)}</p>
      <p><b>Доставка:</b> ${escapeHtml(order.deliveryMethod || '—')} · ${escapeHtml(
        [order.deliveryCity, order.deliveryAddress].filter(Boolean).join(', ') ||
          '—',
      )}</p>
      <p><b>Коментар:</b> ${escapeHtml(order.comment || '—')}</p>
      <p><b>Сума:</b> ${Number(order.total).toLocaleString('uk-UA')} ₴</p>
      <ul>${itemsHtml}</ul>
    `;

    const text = [
      `Нове замовлення ${order.id}`,
      `Клієнт: ${order.firstName} ${order.lastName}`,
      `Телефон: ${order.phone}`,
      `Email: ${order.email}`,
      `Сума: ${Number(order.total).toLocaleString('uk-UA')} ₴`,
      ...order.items.map(
        (i) =>
          `- ${i.name} × ${i.quantity}: ${(i.price * i.quantity).toLocaleString('uk-UA')} ₴`,
      ),
    ].join('\n');

    const apiKey = this.config.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        `Mail skipped (no RESEND_API_KEY). Order ${order.id} → ${to}`,
      );
      return;
    }

    try {
      const from =
        this.config.get<string>('MAIL_FROM') ||
        'Secret Garden <onboarding@resend.dev>';

      await this.sendResendEmail(apiKey, {
        from,
        to: [to],
        subject,
        html,
        text,
      });

      this.logger.log(`Order email sent → ${to}`);
    } catch (err) {
      this.logger.error(
        `Failed to send order email ${order.id}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  async sendPasswordResetCode(email: string, code: string) {
    const subject = 'Secret Garden · код для відновлення пароля';
    const html = `
      <h2>Відновлення пароля</h2>
      <p>Ваш код: <b>${escapeHtml(code)}</b></p>
      <p>Код дійсний 15 хвилин.</p>
    `;
    const text = `Код для відновлення пароля Secret Garden: ${code}`;

    const apiKey = this.config.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        `Password reset mail skipped (no RESEND_API_KEY). Code for ${email}: ${code}`,
      );
      return;
    }

    try {
      const from =
        this.config.get<string>('MAIL_FROM') ||
        'Secret Garden <onboarding@resend.dev>';

      await this.sendResendEmail(apiKey, {
        from,
        to: [email],
        subject,
        html,
        text,
      });

      this.logger.log(`Password reset email sent → ${email}`);
    } catch (err) {
      this.logger.error(
        `Failed to send password reset email to ${email}`,
        err instanceof Error ? err.stack : String(err),
      );
      throw err;
    }
  }

  /** Працює і на Node 16 (без глобального fetch). */
  private sendResendEmail(
    apiKey: string,
    payload: {
      from: string;
      to: string[];
      subject: string;
      html: string;
      text: string;
    },
  ): Promise<void> {
    const body = JSON.stringify(payload);

    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: 'api.resend.com',
          path: '/emails',
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => {
            const text = Buffer.concat(chunks).toString('utf8');
            const status = res.statusCode ?? 0;
            if (status < 200 || status >= 300) {
              reject(new Error(`Resend ${status}: ${text}`));
              return;
            }
            resolve();
          });
        },
      );

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
