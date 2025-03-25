import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Nullable, Nullish } from "../types";

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

export function safeJsonParse<T>(
  value: unknown,
  catchValue: Nullable<T> = null,
): Nullable<T> {
  try {
    return JSON.parse(value as string) as T;
  } catch {
    return catchValue;
  }
}

export function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 Bytes";

  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));

  return parseFloat((bytes / Math.pow(1024, i)).toFixed(1)) + " " + sizes[i];
}

export function generateFileAlias() {
  return crypto.randomUUID();
}

export function generateMasterKey() {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

export function generateRandomKey(length: number) {
  return crypto.getRandomValues(new Uint8Array(length));
}

export function encryptData(data: ArrayBuffer, key: CryptoKey, iv: Uint8Array) {
  return crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
}

export function decryptData(data: ArrayBuffer, key: CryptoKey, iv: Uint8Array) {
  return crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
}

export async function exportKey(key: CryptoKey) {
  const rawKey = await crypto.subtle.exportKey("raw", key);

  return uint8ArrayToBase64(new Uint8Array(rawKey));
}

export function importKey(key: string) {
  const data = base64ToUint8Array(key);

  return crypto.subtle.importKey("raw", data, { name: "AES-GCM" }, true, [
    "encrypt",
    "decrypt",
  ]);
}

export function uint8ArrayToBase64(data: Uint8Array) {
  return btoa(String.fromCharCode(...data));
}

export function base64ToUint8Array(data: string) {
  const binary = atob(data);

  const array = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }

  return array;
}
