const euros = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

/** Formats an amount in euros the French way, for example "7,98 €". */
export function formatEuros(amount: number): string {
  return euros.format(amount);
}

/** Formats a ratio as a rounded percentage, for example "42 %". */
export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)} %`;
}
