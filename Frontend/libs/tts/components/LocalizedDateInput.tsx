"use client";

import React from "react";
import { Calendar } from "lucide-react";

interface LocalizedDateInputProps {
  name: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  disabled?: boolean;
  ariaLabel: string;
}

const formatDisplayDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
};

export const LocalizedDateInput: React.FC<LocalizedDateInputProps> = ({
  name,
  value,
  onChange,
  disabled = false,
  ariaLabel,
}) => (
  <div className="relative flex w-full items-center justify-between pt-2 pb-0.5">
    <span
      aria-hidden="true"
      className="text-sm font-semibold text-zinc-800 dark:text-zinc-200"
    >
      {formatDisplayDate(value) || "dd/mm/yyyy"}
    </span>

    <Calendar className="w-4 h-4 text-zinc-400 pointer-events-none" />

    <input
      type="date"
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
      aria-label={ariaLabel}
      className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
    />
  </div>
);
