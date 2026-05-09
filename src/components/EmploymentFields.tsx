"use client";

import { useState } from "react";

import type { EmploymentStatus, YearInSchool } from "@/lib/types";

type Theme = "dark" | "light";

type Defaults = {
  employment_status: EmploymentStatus | null;
  position: string | null;
  company: string | null;
  university: string | null;
  grad_year: number | null;
  year_in_school: YearInSchool | null;
};

type Props = {
  defaults: Defaults;
  /** "dark" = on a green card (gold labels), "light" = on a white card (gray labels). */
  theme?: Theme;
};

const THIS_YEAR = new Date().getFullYear();

const YEARS: YearInSchool[] = ["Freshman", "Sophomore", "Junior", "Senior"];

function initialStatus(value: EmploymentStatus | null): EmploymentStatus {
  if (value === "student" || value === "postgrad" || value === "employed") {
    return value;
  }
  return "employed";
}

export function EmploymentFields({ defaults, theme = "dark" }: Props) {
  const [status, setStatus] = useState<EmploymentStatus>(
    initialStatus(defaults.employment_status),
  );

  const labelClass =
    theme === "dark"
      ? "block text-[10px] uppercase tracking-[0.15em] text-fh-gold font-semibold mb-1"
      : "block text-[10px] uppercase tracking-[0.15em] text-fh-gray-light font-semibold mb-1";

  const inputClass =
    theme === "dark"
      ? "w-full h-10 px-3 rounded-md border border-fh-gray/25 bg-white text-fh-green placeholder:text-fh-green/60 focus:border-fh-green focus:outline-none focus:ring-2 focus:ring-fh-gold/40"
      : "w-full h-10 px-3 rounded-md border border-fh-gray/25 bg-white focus:border-fh-green focus:outline-none focus:ring-2 focus:ring-fh-green/20";

  const segmentBaseClass =
    "flex-1 px-2 py-2 rounded text-sm font-semibold transition";
  const segmentInactive =
    theme === "dark"
      ? "text-white/80 hover:bg-white/10"
      : "text-fh-gray hover:bg-fh-gray/10";
  const segmentActive = "bg-fh-gold text-fh-green";
  const segmentWrapClass =
    theme === "dark"
      ? "flex gap-1 rounded-md p-1 bg-white/10 border border-white/20"
      : "flex gap-1 rounded-md p-1 bg-fh-gray/5 border border-fh-gray/25";

  return (
    <>
      <div className="sm:col-span-2">
        <label className={labelClass}>Current status</label>
        <div className={segmentWrapClass}>
          <button
            type="button"
            onClick={() => setStatus("student")}
            className={`${segmentBaseClass} ${
              status === "student" ? segmentActive : segmentInactive
            }`}
          >
            Student
          </button>
          <button
            type="button"
            onClick={() => setStatus("employed")}
            className={`${segmentBaseClass} ${
              status === "employed" ? segmentActive : segmentInactive
            }`}
          >
            Employed
          </button>
          <button
            type="button"
            onClick={() => setStatus("postgrad")}
            className={`${segmentBaseClass} ${
              status === "postgrad" ? segmentActive : segmentInactive
            }`}
          >
            Postgrad
          </button>
        </div>
        <input type="hidden" name="employment_status" value={status} />
      </div>

      {status === "employed" && (
        <>
          <div>
            <label className={labelClass}>Position</label>
            <input
              type="text"
              name="position"
              defaultValue={defaults.position ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Company</label>
            <input
              type="text"
              name="company"
              defaultValue={defaults.company ?? ""}
              className={inputClass}
            />
          </div>
          <input type="hidden" name="university" value="" />
          <input type="hidden" name="grad_year" value="" />
          <input type="hidden" name="year_in_school" value="" />
        </>
      )}

      {status === "postgrad" && (
        <>
          <div>
            <label className={labelClass}>University</label>
            <input
              type="text"
              name="university"
              defaultValue={defaults.university ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Expected grad year</label>
            <input
              type="number"
              name="grad_year"
              min={1900}
              max={2100}
              placeholder={String(THIS_YEAR + 1)}
              defaultValue={
                defaults.grad_year !== null && defaults.grad_year !== undefined
                  ? String(defaults.grad_year)
                  : ""
              }
              className={inputClass}
            />
          </div>
          <input type="hidden" name="position" value="" />
          <input type="hidden" name="company" value="" />
          <input type="hidden" name="year_in_school" value="" />
        </>
      )}

      {status === "student" && (
        <>
          <div>
            <label className={labelClass}>Year in school</label>
            <select
              name="year_in_school"
              defaultValue={defaults.year_in_school ?? ""}
              className={inputClass}
            >
              <option value="">—</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Expected grad year</label>
            <input
              type="number"
              name="grad_year"
              min={1900}
              max={2100}
              placeholder={String(THIS_YEAR + 1)}
              defaultValue={
                defaults.grad_year !== null && defaults.grad_year !== undefined
                  ? String(defaults.grad_year)
                  : ""
              }
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>University</label>
            <input
              type="text"
              name="university"
              defaultValue={defaults.university ?? ""}
              placeholder="Kansas State University"
              className={inputClass}
            />
          </div>
          <input type="hidden" name="position" value="" />
          <input type="hidden" name="company" value="" />
        </>
      )}
    </>
  );
}
