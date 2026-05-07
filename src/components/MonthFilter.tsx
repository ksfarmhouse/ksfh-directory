"use client";

import { useRouter } from "next/navigation";
import type { ChangeEvent } from "react";

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

type Props = {
  basePath: string;
  /** Current month (1–12) or null for "All". */
  currentMonth: number | null;
  /** Current sort, preserved across navigation. */
  sort: string;
  /** Optional search query, preserved across navigation. */
  query?: string;
};

export function MonthFilter({
  basePath,
  currentMonth,
  sort,
  query,
}: Props) {
  const router = useRouter();

  function handleChange(e: ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (sort && sort !== "name") params.set("sort", sort);
    if (e.target.value) params.set("month", e.target.value);
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  return (
    <select
      value={currentMonth !== null ? String(currentMonth) : ""}
      onChange={handleChange}
      className="h-9 px-3 rounded-md border border-fh-gray/25 bg-white text-fh-green font-medium focus:border-fh-green focus:outline-none"
      aria-label="Filter by birthday month"
    >
      <option value="">All months</option>
      {MONTHS.map((name, i) => (
        <option key={name} value={String(i + 1)}>
          {name}
        </option>
      ))}
    </select>
  );
}
