export function formatAmount(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = (abs / 100).toFixed(2);
  const parts = formatted.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `₹${parts.join(".")}`;
}

export function formatAmountSigned(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = (abs / 100).toFixed(2);
  const parts = formatted.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const valueStr = `₹${parts.join(".")}`;
  
  if (amount > 0) return `+${valueStr}`;
  if (amount < 0) return `-${valueStr}`;
  return valueStr;
}

export function parseToCents(value: string): number {
  const num = parseFloat(value.replace(/[^0-9.]/g, ""));
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}
