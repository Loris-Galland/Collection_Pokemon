import { numberLocale } from '@/i18n';

// One formatter per locale, since creating them is slow and the app language can change.
const formatters = new Map<string, Intl.NumberFormat>();

function formatter(kind: 'plain' | 'signed'): Intl.NumberFormat {
  const locale = numberLocale();
  const key = `${kind}:${locale}`;
  let format = formatters.get(key);
  if (!format) {
    format = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'EUR',
      signDisplay: kind === 'signed' ? 'exceptZero' : 'auto',
    });
    formatters.set(key, format);
  }
  return format;
}

/** Formats an amount in euros in the app language, for example "7,98 €" in French or "€7.98" in English. */
export function formatEuros(amount: number): string {
  return formatter('plain').format(amount);
}

/** Formats a change in euros with its sign, for example "+1,20 €". */
export function formatSignedEuros(amount: number): string {
  return formatter('signed').format(amount);
}

/** Formats a ratio as a rounded percentage, for example "42 %" in French or "42%" in English. */
export function formatPercent(ratio: number): string {
  const percent = Math.round(ratio * 100);
  return numberLocale() === 'fr-FR' ? `${percent} %` : `${percent}%`;
}

/** Formats a size on the phone, for example "12 Mo" in French or "12 MB" in English. */
export function formatSize(bytes: number): string {
  const megabytes = bytes / 1_000_000;
  const shown = megabytes < 10 ? Math.round(megabytes * 10) / 10 : Math.round(megabytes);
  const number = new Intl.NumberFormat(numberLocale()).format(shown);
  return numberLocale() === 'fr-FR' ? `${number} Mo` : `${number} MB`;
}

/** Formats a day, for example "17 novembre" in French or "November 17" in English. */
export function formatDay(isoDate: string): string {
  return new Intl.DateTimeFormat(numberLocale(), { day: 'numeric', month: 'long' }).format(new Date(isoDate));
}
