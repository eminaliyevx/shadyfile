import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Nullish } from "../types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const messages = {
  errors: {
    required: (field: string) => `${field} is required`,
    min: (field: string, min: number) =>
      `${field} must be at least ${min} characters`,
  },
};

export function getErrorMessage<T extends keyof typeof messages.errors>(
  type: T,
  ...params: Parameters<(typeof messages.errors)[T]>
) {
  return (messages.errors[type] as (...args: unknown[]) => string)(...params);
}

export function selfOrUndefined<T>(value?: Nullish<T>) {
  return value ?? undefined;
}

export function getInitialsFromName(name: string) {
  return name
    .split(" ")
    .map((value) => value[0])
    .join("");
}
