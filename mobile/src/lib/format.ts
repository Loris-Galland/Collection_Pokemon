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
