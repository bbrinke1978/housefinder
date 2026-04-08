/**
 * Date formatting utilities that always use Mountain Time.
 * Server components render in UTC on Azure — these ensure
 * consistent Mountain Time display everywhere.
 */

const TZ = "America/Denver";

/** "Apr 7, 2026" */
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "Apr 7" */
export function formatDateShort(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
  });
}

/** "Apr 7, 2:30 PM" */
export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "Apr 7, 2026, 2:30 PM" */
export function formatDateTimeFull(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "2:30 PM" */
export function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString("en-US", {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
  });
}
