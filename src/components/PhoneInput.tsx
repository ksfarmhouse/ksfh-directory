"use client";

import { useState, type ChangeEvent } from "react";

function digitsFrom(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10);
}

function format(digits: string): string {
  const d = digits.slice(0, 10);
  if (d.length === 0) return "";
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

type Props = {
  name: string;
  defaultValue?: string | null;
  className?: string;
};

export function PhoneInput({ name, defaultValue, className }: Props) {
  const [value, setValue] = useState(() =>
    format(digitsFrom(defaultValue ?? "")),
  );

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setValue(format(digitsFrom(e.target.value)));
  }

  return (
    <input
      type="tel"
      name={name}
      value={value}
      onChange={handleChange}
      placeholder="(123) 456-7890"
      inputMode="tel"
      autoComplete="tel"
      maxLength={14}
      className={className}
    />
  );
}
