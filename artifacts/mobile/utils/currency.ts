export function formatAmount(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = (abs / 100).toFixed(2);
  return `$${formatted}`;
}

export function formatAmountSigned(amount: number): string {
  const formatted = (Math.abs(amount) / 100).toFixed(2);
  if (amount > 0) return `+$${formatted}`;
  if (amount < 0) return `-$${formatted}`;
  return `$${formatted}`;
}

export function parseToCents(value: string): number {
  const num = parseFloat(value.replace(/[^0-9.]/g, ""));
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}
