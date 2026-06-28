"use client";

import React, { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { getIndustries } from "../services/api";

export interface IndustryLevel4 {
  id?: number;
  code: string;
  name: string;
}

export const MOCK_INDUSTRIES_LEVEL4: IndustryLevel4[] = [];

interface IndustrySearchSelectProps {
  value: string;
  onChange: (code: string, name: string, id?: number) => void;
  disabled?: boolean;
  error?: boolean;
}

export const IndustrySearchSelect: React.FC<IndustrySearchSelectProps> = ({
  value,
  onChange,
  disabled = false,
  error = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [industries, setIndustries] = useState<IndustryLevel4[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    getIndustries()
      .then((res) => {
        if (res.success && res.data) {
          setIndustries(res.data);
        }
      })
      .catch((err) => {
        console.error("Không thể tải danh sách ngành nghề", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const selectedIndustry = industries.find((ind) => ind.code === value);
  const displayValue = selectedIndustry
    ? `${selectedIndustry.code} - ${selectedIndustry.name}`
    : "";

  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
    }
  }, [isOpen]);

  const filtered = industries.filter(
    (ind) =>
      ind.code.includes(searchTerm) ||
      ind.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="relative w-full">
      <div
        className={`relative border rounded-xl px-4 py-2 flex flex-col justify-center bg-white dark:bg-zinc-950 transition-all focus-within:ring-1 focus-within:ring-blue-600 focus-within:border-blue-600
          ${error ? "border-red-500 ring-1 ring-red-500" : "border-zinc-200 dark:border-zinc-800"}
          ${disabled ? "opacity-60 cursor-not-allowed bg-zinc-50 dark:bg-zinc-900/40" : ""}
        `}
      >
        <label
          className={`absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] font-bold transition-colors
          ${error ? "text-red-500" : "text-zinc-400 dark:text-zinc-500"}
        `}
        >
          Ngành nghề kinh doanh <span className="text-red-500">*</span>
        </label>

        <div className="relative flex items-center justify-between w-full pt-2 pb-0.5">
          <input
            type="text"
            readOnly
            disabled={disabled}
            className={`w-full bg-transparent border-0 outline-none text-sm font-semibold pr-8 transition-colors ${
              disabled ? "cursor-not-allowed" : "cursor-pointer"
            } ${
              displayValue
                ? "text-zinc-800 dark:text-zinc-200"
                : "text-zinc-400 dark:text-zinc-500"
            }`}
            placeholder={
              isLoading ? "Đang tải..." : "Chọn ngành nghề kinh doanh"
            }
            value={
              displayValue ||
              (isLoading ? "Đang tải..." : "Chọn ngành nghề kinh doanh")
            }
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => {
              if (!disabled && !isLoading) setIsOpen(true);
            }}
            onClick={() => {
              if (!disabled && !isLoading) setIsOpen(true);
            }}
          />
          <ChevronDown
            className={`absolute right-0 w-4.5 h-4.5 text-zinc-400 pointer-events-none transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </div>

      {isOpen && !disabled && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 right-0 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900 shadow-xl z-50 py-1 select-none animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="px-3 py-1.5 border-b border-zinc-150 dark:border-zinc-850">
              <input
                type="text"
                autoFocus
                className="w-full text-xs px-2.5 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 focus:border-blue-500 transition-colors"
                placeholder="Tìm mã hoặc tên ngành..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {filtered.length === 0 ? (
              <div className="p-3 text-center text-xs text-zinc-400">
                Không tìm thấy ngành nghề phù hợp
              </div>
            ) : (
              filtered.map((ind) => (
                <button
                  key={ind.code}
                  type="button"
                  onClick={() => {
                    onChange(ind.code, ind.name, ind.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 flex items-center justify-between font-medium transition-colors
                    ${value === ind.code ? "bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 font-bold" : ""}
                  `}
                >
                  <span>
                    {ind.code} - {ind.name}
                  </span>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};
