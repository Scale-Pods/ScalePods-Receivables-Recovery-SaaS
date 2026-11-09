/**
 * Indian Rupee & Number Formatting Utilities
 */

export function formatINR(amount: number, options?: { compact?: boolean; hideSymbol?: boolean }): string {
  if (isNaN(amount)) return '₹0';

  const symbol = options?.hideSymbol ? '' : '₹';

  if (options?.compact) {
    const abs = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';
    if (abs >= 10000000) {
      // Crores
      return `${sign}${symbol}${(abs / 10000000).toFixed(2).replace(/\.00$/, '')} Cr`;
    }
    if (abs >= 100000) {
      // Lakhs
      return `${sign}${symbol}${(abs / 100000).toFixed(1).replace(/\.0$/, '')}L`;
    }
    if (abs >= 1000) {
      // Thousands
      return `${sign}${symbol}${(abs / 1000).toFixed(0)}k`;
    }
    return `${sign}${symbol}${abs}`;
  }

  // Standard Indian comma separator (e.g. 1,00,000)
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount);

  return `${symbol}${formatted}`;
}

export function formatLakhs(amount: number): string {
  const lakhs = (amount / 100000).toFixed(1).replace(/\.0$/, '');
  return `₹${lakhs} Lakhs`;
}
