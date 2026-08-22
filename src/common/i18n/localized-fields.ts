export type AppLocale = 'uk' | 'en';

export function parseAcceptLanguage(header?: string): AppLocale {
  if (!header) return 'uk';
  const primary = header.split(',')[0]?.trim().toLowerCase() ?? '';
  if (primary.startsWith('en')) return 'en';
  return 'uk';
}

export function pickLocalizedField(
  record: Record<string, unknown>,
  field: string,
  locale: AppLocale = 'uk',
): string {
  const enKey = `${field}En`;
  const ukKey = `${field}Uk`;

  if (locale === 'en') {
    const enValue = record[enKey];
    if (typeof enValue === 'string' && enValue.trim()) return enValue;
  }

  const ukValue = record[ukKey];
  if (typeof ukValue === 'string' && ukValue.trim()) return ukValue;

  const base = record[field];
  return typeof base === 'string' ? base : '';
}

export function resolveProductI18nInput(dto: {
  name?: string;
  nameEn?: string | null;
  nameUk?: string | null;
  shortDescription?: string | null;
  shortDescriptionEn?: string | null;
  shortDescriptionUk?: string | null;
  description?: string | null;
  descriptionEn?: string | null;
  descriptionUk?: string | null;
  label?: string | null;
  labelEn?: string | null;
  labelUk?: string | null;
}) {
  const nameUk = dto.nameUk ?? dto.name ?? null;
  const name = dto.name ?? nameUk ?? '';
  const shortDescriptionUk =
    dto.shortDescriptionUk ?? dto.shortDescription ?? null;
  const shortDescription = dto.shortDescription ?? shortDescriptionUk ?? null;
  const descriptionUk = dto.descriptionUk ?? dto.description ?? null;
  const description = dto.description ?? descriptionUk ?? null;
  const labelUk = dto.labelUk ?? dto.label ?? null;
  const label = dto.label ?? labelUk ?? null;

  return {
    name,
    nameUk,
    nameEn: dto.nameEn ?? null,
    shortDescription,
    shortDescriptionUk,
    shortDescriptionEn: dto.shortDescriptionEn ?? null,
    description,
    descriptionUk,
    descriptionEn: dto.descriptionEn ?? null,
    label,
    labelUk,
    labelEn: dto.labelEn ?? null,
  };
}

export function resolveCategoryI18nInput(dto: {
  name?: string;
  nameEn?: string | null;
  nameUk?: string | null;
}) {
  const nameUk = dto.nameUk ?? dto.name ?? null;
  const name = dto.name ?? nameUk ?? '';
  return {
    name,
    nameUk,
    nameEn: dto.nameEn ?? null,
  };
}
