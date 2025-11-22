/**
 * Formats a timestamp into a human-readable "time ago" string
 * @param timestamp - ISO date string or Date object
 * @returns Formatted string like "Just now", "30s ago", "2m ago", etc.
 */
export function formatTimeAgo(timestamp: string | Date | null | undefined): string {
  if (!timestamp) return '';

  const now = Date.now();
  const then = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp.getTime();
  const secondsAgo = Math.floor((now - then) / 1000);

  if (secondsAgo < 5) {
    return 'Just now';
  } else if (secondsAgo < 60) {
    return `${secondsAgo}s ago`;
  } else if (secondsAgo < 3600) {
    const minutes = Math.floor(secondsAgo / 60);
    return `${minutes}m ago`;
  } else if (secondsAgo < 86400) {
    const hours = Math.floor(secondsAgo / 3600);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(secondsAgo / 86400);
    return `${days}d ago`;
  }
}

// Format a date using local timezone to avoid UTC shifts (e.g., showing tomorrow when it's still today locally)
export function formatLocalDateISO(date: Date = new Date()): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}
