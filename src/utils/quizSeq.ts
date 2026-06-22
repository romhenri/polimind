/**
 * Reads optional `seq` from quiz JSON (number or numeric string like "0", "12").
 * Invalid/missing → undefined for metadata; use `seqSortValue` for ordering.
 */
export function parseQuizSeq(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string") {
    const t = value.trim();
    if (t === "") return undefined;
    if (/^-?\d+$/.test(t)) return Number.parseInt(t, 10);
  }
  return undefined;
}

/** For API sort: finite seq first (ascending); missing/invalid → +∞ */
export function seqSortValue(value: unknown): number {
  const n = parseQuizSeq(value);
  return n === undefined ? Number.POSITIVE_INFINITY : n;
}
