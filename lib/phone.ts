// Kept free of imports on purpose: db/roster-import.mjs loads this file
// directly with Node, which strips types but does not resolve extensionless
// imports.

/** Digits only; Brazilian numbers get the 55 prefix. Returns null if unusable. */
export function normalizePhone(raw: string | null): string | null {
  if (!raw) return null;
  // Drop a single national trunk zero (e.g. "046 3523-4567") before measuring.
  const digits = raw.replace(/\D/g, '').replace(/^0/, '');
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    return digits;
  }
  return null;
}
