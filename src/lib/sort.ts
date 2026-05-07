import { birthdayMonthDayKey, daysUntilBirthday } from "./format";

export type Sort = "name" | "city" | "state" | "birthday" | "next-birthday";

export const VALID_SORTS: readonly Sort[] = [
  "name",
  "city",
  "state",
  "birthday",
  "next-birthday",
];

export const SORT_LABELS: Record<Sort, string> = {
  name: "Name",
  city: "City",
  state: "State",
  birthday: "Birthday",
  "next-birthday": "Next Birthday",
};

export function parseSort(value: string | undefined): Sort {
  return VALID_SORTS.includes(value as Sort) ? (value as Sort) : "name";
}

export function parseMonth(value: string | undefined): number | null {
  if (!value) return null;
  const n = parseInt(value, 10);
  return n >= 1 && n <= 12 ? n : null;
}

type Sortable = {
  full_name: string;
  city: string | null;
  state: string | null;
  birthday: string | null;
};

function compareNullable(a: string | null, b: string | null): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b);
}

export function sortProfiles<T extends Sortable>(
  profiles: T[],
  sort: Sort,
  today: Date = new Date(),
): T[] {
  return [...profiles].sort((a, b) => {
    const nameCmp = a.full_name.localeCompare(b.full_name);
    switch (sort) {
      case "city":
        return compareNullable(a.city, b.city) || nameCmp;
      case "state":
        return (
          compareNullable(a.state, b.state) ||
          compareNullable(a.city, b.city) ||
          nameCmp
        );
      case "birthday":
        return (
          compareNullable(
            birthdayMonthDayKey(a.birthday),
            birthdayMonthDayKey(b.birthday),
          ) || nameCmp
        );
      case "next-birthday": {
        const aDays = daysUntilBirthday(a.birthday, today);
        const bDays = daysUntilBirthday(b.birthday, today);
        if (aDays === null && bDays === null) return nameCmp;
        if (aDays === null) return 1;
        if (bDays === null) return -1;
        return aDays - bDays || nameCmp;
      }
      case "name":
      default:
        return nameCmp;
    }
  });
}

export function filterByMonth<T extends { birthday: string | null }>(
  profiles: T[],
  month: number | null,
): T[] {
  if (month === null) return profiles;
  return profiles.filter((p) => {
    if (!p.birthday) return false;
    const m = /^\d{4}-(\d{2})/.exec(p.birthday);
    return m ? parseInt(m[1], 10) === month : false;
  });
}

export type CardEmphasis =
  | "default"
  | "city"
  | "state"
  | "birthday"
  | "next-birthday";

export function emphasisFor(sort: Sort, month: number | null): CardEmphasis {
  // Filtering by month makes the date the most relevant info.
  if (month !== null) return "birthday";
  if (sort === "name") return "default";
  return sort;
}
