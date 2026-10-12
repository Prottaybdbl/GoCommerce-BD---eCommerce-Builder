/**
 * Pure Utility Functions (Zero-Dependency)
 * Safe for client-side bundles without pulling in heavy validation schemas.
 */

const BANGLA_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

export function convertBanglaToAsciiDigits(val: string): string {
  return val.replace(/[০-৯]/g, (d) => String(BANGLA_DIGITS.indexOf(d)));
}

export const bdPhoneRegex = /^(?:\+?88)?(01[3-9]\d{8})$/;

export function normalizeBdPhone(val: string): string {
  const ascii = convertBanglaToAsciiDigits(val);
  const stripped = ascii.replace(/[\s\-()]/g, "");
  const match = stripped.match(bdPhoneRegex);
  return match ? `+88${match[1]}` : stripped;
}

export function poishaToBdt(poisha: number): number {
  return poisha / 100;
}

export function bdtToPoisha(bdt: number): number {
  return Math.round(bdt * 100);
}

export function formatBdt(poisha: number): string {
  const bdt = poishaToBdt(poisha);
  return `৳${bdt.toLocaleString("en-BD", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export const formatPoishaToBdt = formatBdt;
