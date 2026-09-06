import { JournalEntry } from '../types';

/**
 * Returns YYYY-MM-DD string in the user's local timezone.
 * Handles both ISO strings and Date objects reliably without UTC day-drift.
 */
export function toLocalDateString(date: Date | string | undefined | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Builds a Map of YYYY-MM-DD -> JournalEntry[] from an array of entries.
 * Sorted by newest updatedAt/createdAt within each day.
 */
export function getEntriesPresenceMap(entries: JournalEntry[]): Map<string, JournalEntry[]> {
  const map = new Map<string, JournalEntry[]>();
  for (const entry of entries) {
    const rawDate = entry.createdAt || entry.updatedAt;
    if (!rawDate) continue;
    const dateStr = toLocalDateString(rawDate);
    if (!dateStr) continue;
    const existing = map.get(dateStr) || [];
    existing.push(entry);
    map.set(dateStr, existing);
  }

  // Sort each date's entries with latest first
  map.forEach((list) => {
    list.sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt).getTime();
      return timeB - timeA;
    });
  });

  return map;
}

/**
 * Checks whether at least one check-in exists for the given local date string.
 */
export function hasEntryOnDate(dateStr: string, presenceMap: Map<string, JournalEntry[]>): boolean {
  const list = presenceMap.get(dateStr);
  return Boolean(list && list.length > 0);
}

/**
 * Returns the primary check-in for a given local date string, if one exists.
 */
export function getPrimaryEntryForDate(dateStr: string, presenceMap: Map<string, JournalEntry[]>): JournalEntry | undefined {
  const list = presenceMap.get(dateStr);
  return list && list.length > 0 ? list[0] : undefined;
}
