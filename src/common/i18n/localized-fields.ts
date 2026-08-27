import { translateUkToEn } from './uk-en-translate';

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

  const asString = (v: unknown) =>
    typeof v === 'string' ? v : v == null ? '' : String(v);

  if (locale === 'en') {
    const enValue = asString(record[enKey]).trim();
    if (enValue) return enValue;
    const ukValue = asString(record[ukKey]).trim();
    const base = asString(record[field]).trim();
    const source = ukValue || base;
    return source ? translateUkToEn(source) : '';
  }

  const ukValue = asString(record[ukKey]).trim();
  if (ukValue) return ukValue;
  return asString(record[field]);
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
  const localized: Record<string, unknown> = {
    ...record,
    name: pickLocalizedField(record, 'name', locale),
    shortDescription: pickLocalizedField(record, 'shortDescription', locale),
    description: pickLocalizedField(record, 'description', locale),
    label: pickLocalizedField(record, 'label', locale),
  };

  if (Array.isArray(record.categories)) {
    localized.categories = record.categories.map((c) =>
      c && typeof c === 'object'
        ? localizeCategoryRecord(c as Record<string, unknown>, locale)
        : c,
    );
  }

  if (Array.isArray(record.characteristics)) {
    localized.characteristics = record.characteristics.map((ch) => {
      if (!ch || typeof ch !== 'object') return ch;
      const row = ch as Record<string, unknown>;
      return {
        ...row,
        name: pickLocalizedField(row, 'name', locale) || translateMaybe(row.name, locale),
        value: pickLocalizedField(row, 'value', locale) || translateMaybe(row.value, locale),
      };
    });
  }

  if (Array.isArray(record.descriptionBlocks)) {
    localized.descriptionBlocks = record.descriptionBlocks.map((block) => {
      if (!block || typeof block !== 'object') return block;
      const row = block as Record<string, unknown>;
      const content = row.content;
      const items = row.items;
      return {
        ...row,
        content:
          typeof content === 'string' ? translateMaybe(content, locale) : content,
        items: Array.isArray(items)
          ? items.map((it) =>
              typeof it === 'string' ? translateMaybe(it, locale) : it,
            )
          : items,
      };
    });
  }

  return localized as T;
}

function translateMaybe(value: unknown, locale: AppLocale): string {
  const text = typeof value === 'string' ? value : value == null ? '' : String(value);
  if (!text) return text;
  return locale === 'en' ? translateUkToEn(text) : text;
}

function localizeFilterRecord(
  filter: Record<string, unknown>,
  locale: AppLocale,
): Record<string, unknown> {
  const values = Array.isArray(filter.values)
    ? filter.values.map((v) => {
        if (!v || typeof v !== 'object') return v;
        const row = v as Record<string, unknown>;
        return {
          ...row,
          value: pickLocalizedField(row, 'value', locale) || translateMaybe(row.value, locale),
          name: pickLocalizedField(row, 'name', locale) || translateMaybe(row.name, locale),
        };
      })
    : filter.values;

  return {
    ...filter,
    name: pickLocalizedField(filter, 'name', locale) || translateMaybe(filter.name, locale),
    values,
  };
}

export function localizeCategoryRecord<
  T extends Record<string, unknown> & { children?: T[] },
>(record: T, locale: AppLocale): T {
  const filters = Array.isArray(record.filters)
    ? record.filters.map((f) =>
        f && typeof f === 'object'
          ? localizeFilterRecord(f as Record<string, unknown>, locale)
          : f,
      )
    : record.filters;

  return {
    ...record,
    name: pickLocalizedField(record, 'name', locale),
    filters,
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
        ? locale === 'en'
          ? translateUkToEn(titleSub)
          : titleSub
        : null;

  return {
    ...record,
    title: pickLocalizedField(record, 'title', locale),
    titleSub: localizedTitleSub,
    description: pickLocalizedField(record, 'description', locale),
  };
}

export function localizeFaqRecord<
  T extends Record<string, unknown>,
>(record: T, locale: AppLocale): T {
  return {
    ...record,
    title: pickLocalizedField(record, 'title', locale),
    body: pickLocalizedField(record, 'body', locale),
  };
}

export function localizeAboutRecord<
  T extends Record<string, unknown>,
>(record: T, locale: AppLocale): T {
  return {
    ...record,
    title: pickLocalizedField(record, 'title', locale),
    body: pickLocalizedField(record, 'body', locale),
    ctaLabel: pickLocalizedField(record, 'ctaLabel', locale),
  };
}


export function localizeContactsRecord<
  T extends Record<string, unknown>,
>(record: T, locale: AppLocale): T {
  const fields = [
    'introTitle',
    'introText',
    'scheduleTitle',
    'daysOff',
    'holidayNote',
    'address',
  ] as const;

  const next: Record<string, unknown> = { ...record };
  for (const field of fields) {
    const enKey = `${field}En`;
    const current = record[field];
    if (locale === 'en') {
      const enVal = record[enKey];
      if (typeof enVal === 'string' && enVal.trim()) {
        next[field] = enVal;
      } else if (typeof current === 'string' && current.trim()) {
        next[field] = translateUkToEn(current);
      }
    } else if (typeof current === 'string') {
      next[field] = current;
    }
  }
  return next as T;
}
