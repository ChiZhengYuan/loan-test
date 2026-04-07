import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function maskId(value: string) {
  if (value.length <= 6) return value;
  return `${value.slice(0, 2)}****${value.slice(-2)}`;
}

export function maskPhone(value: string) {
  if (value.length <= 4) return value;
  return `${value.slice(0, 3)}****${value.slice(-2)}`;
}

export function formatCurrency(value: string | number | bigint) {
  const amount = typeof value === "string" ? Number(value) : Number(value);
  return new Intl.NumberFormat("zh-TW").format(amount);
}
