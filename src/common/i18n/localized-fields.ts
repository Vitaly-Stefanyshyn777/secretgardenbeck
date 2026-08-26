export type AppLocale = 'uk' | 'en';

export function parseAcceptLanguage(header?: string): AppLocale {
  if (!header) return 'uk';
  const primary = header.split(',')[0]?.trim().toLowerCase() ?? '';
  if (primary.startsWith('en')) return 'en';
  return 'uk';
}

export function resolveRequestLocale(
  acceptLanguage?: string,
  queryLang?: string,
): AppLocale {
  const q = queryLang?.trim().toLowerCase() ?? '';
  if (q.startsWith('en')) return 'en';
  if (q.startsWith('uk')) return 'uk';
  return parseAcceptLanguage(acceptLanguage);
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

export function localizeProductRecord<
  T extends Record<string, unknown>,
>(record: T, locale: AppLocale): T {
  return {
    ...record,
    name: pickLocalizedField(record, 'name', locale),
    shortDescription: pickLocalizedField(record, 'shortDescription', locale),
    description: pickLocalizedField(record, 'description', locale),
    label: pickLocalizedField(record, 'label', locale),
  };
}

export function localizeCategoryRecord<
  T extends Record<string, unknown> & { children?: T[] },
>(record: T, locale: AppLocale): T {
  return {
    ...record,
    name: pickLocalizedField(record, 'name', locale),
    children: record.children?.map((child) =>
      localizeCategoryRecord(child, locale),
    ),
  };
}

export function localizeBannerRecord<
  T extends Record<string, unknown>,
>(record: T, locale: AppLocale): T {
  const titleSubEn = record.titleSubEn;
  const titleSub = record.titleSub;
  const localizedTitleSub =
    locale === 'en' &&
    typeof titleSubEn === 'string' &&
    titleSubEn.trim()
      ? titleSubEn
      : typeof titleSub === 'string'
        ? titleSub
        : null;

  return {
    ...record,
    title: pickLocalizedField(record, 'title', locale),
    titleSub: localizedTitleSub,
    description: pickLocalizedField(record, 'description', locale),
  };
}
