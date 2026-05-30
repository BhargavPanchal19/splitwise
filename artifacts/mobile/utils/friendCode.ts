const CODE_PATTERN = /^[a-z0-9]{10,24}$/i;

/** Random alphanumeric friend code (Splitwise-style). */
export function generateFriendCode(length = 16): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/** Deep link / QR payload for adding a friend. */
export function buildFriendInvitePayload(code: string): string {
  return `mobile://add_friend/${code}`;
}

/** Human-readable link shown under the QR card. */
export function buildFriendInviteDisplayUrl(code: string): string {
  return `expensesplitter.app/l/add_friend/${code}`;
}

/** Extract friend code from scanned text or pasted link. */
export function parseFriendCodeFromScan(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;

  const pathMatch = text.match(/add_friend\/([a-z0-9]+)/i);
  if (pathMatch) return pathMatch[1].toLowerCase();

  if (CODE_PATTERN.test(text)) return text.toLowerCase();

  return null;
}
