// Format a US phone number as (XXX) XXX-XXXX. Falls back to the input string
// for non-10-digit values (e.g. international numbers, partials).
export function formatPhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Format a YYYY-MM-DD date string as "Month D, YYYY". Parses the components
// directly to avoid timezone shifts that Date(...) introduces for date-only
// values.
export function formatBirthday(iso: string | null): string | null {
  if (!iso) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  const [, yearStr, monthStr, dayStr] = match;
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${MONTHS[month - 1]} ${day}, ${yearStr}`;
}

// "April 15" — month + day only (no year). Used in widgets where year clutters.
export function formatBirthdayShort(iso: string | null): string | null {
  if (!iso) return null;
  const match = /^\d{4}-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  const month = parseInt(match[1], 10);
  const day = parseInt(match[2], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${MONTHS[month - 1]} ${day}`;
}

// "MM-DD" string for calendar-order sorting (Jan 1 < Dec 31, year-agnostic).
export function birthdayMonthDayKey(iso: string | null): string | null {
  if (!iso) return null;
  const match = /^\d{4}-(\d{2})-(\d{2})/.exec(iso);
  return match ? `${match[1]}-${match[2]}` : null;
}

// Days until the next occurrence of this birthday (0 = today, 1 = tomorrow, …).
// Computed via UTC day arithmetic to avoid DST/timezone half-day issues.
export function daysUntilBirthday(
  iso: string | null,
  today: Date = new Date(),
): number | null {
  if (!iso) return null;
  const match = /^\d{4}-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  const month = parseInt(match[1], 10);
  const day = parseInt(match[2], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const todayY = today.getFullYear();
  const todayM = today.getMonth() + 1;
  const todayD = today.getDate();

  let year = todayY;
  if (month < todayM || (month === todayM && day < todayD)) {
    year = todayY + 1;
  }

  const next = Date.UTC(year, month - 1, day);
  const start = Date.UTC(todayY, todayM - 1, todayD);
  return Math.round((next - start) / (1000 * 60 * 60 * 24));
}

// "today!", "tomorrow", "in 5 days", "in 3 weeks", "in ~4 months"
export function formatBirthdayCountdown(daysUntil: number): string {
  if (daysUntil <= 0) return "today!";
  if (daysUntil === 1) return "tomorrow";
  if (daysUntil < 14) return `in ${daysUntil} days`;
  if (daysUntil < 60) {
    const weeks = Math.round(daysUntil / 7);
    return `in ${weeks} week${weeks === 1 ? "" : "s"}`;
  }
  const months = Math.round(daysUntil / 30);
  return `in ~${months} month${months === 1 ? "" : "s"}`;
}
