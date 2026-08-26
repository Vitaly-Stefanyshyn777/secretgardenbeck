const KYIV_TZ = 'Europe/Kyiv';

export const COURIER_HOURS = {
  startHour: 12,
  startMinute: 0,
  endHour: 20,
  endMinute: 40,
} as const;

function getKyivTimeParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: KYIV_TZ,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(date);

  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return { hour, minute };
}

function toMinutes(hour: number, minute: number) {
  return hour * 60 + minute;
}

export function isCourierDeliveryAvailable(now = new Date()): boolean {
  const { hour, minute } = getKyivTimeParts(now);
  const current = toMinutes(hour, minute);
  const start = toMinutes(COURIER_HOURS.startHour, COURIER_HOURS.startMinute);
  const end = toMinutes(COURIER_HOURS.endHour, COURIER_HOURS.endMinute);
  return current >= start && current <= end;
}

export function isCourierDeliveryMethod(method?: string | null): boolean {
  if (!method) return false;
  const normalized = method.trim().toLowerCase();
  return normalized === 'courier' || normalized === 'uklon';
}

export const COURIER_UNAVAILABLE_MESSAGE =
  'Курʼєрська доставка доступна лише з 12:00 до 20:40 (за київським часом)';
