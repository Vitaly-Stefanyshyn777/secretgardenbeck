import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from, to: [to], subject, html, text }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Resend ${res.status}: ${body}`);
      }

      this.logger.log(`Order email sent → ${to}`);
    } catch (err) {
      this.logger.error(
        `Failed to send order email ${order.id}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
