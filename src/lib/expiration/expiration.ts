import { ExpirationOption } from "@/types/draft";

export interface ExpirationOptionDefinition {
  id: ExpirationOption;
  label: string;
  durationLabel: string;
  description: string;
  days: number | null;
  badge?: string;
}

export const EXPIRATION_OPTIONS: ExpirationOptionDefinition[] = [
  {
    id: "7d",
    label: "7 Days",
    durationLabel: "1 Week",
    description: "Ephemeral birthday week surprise. Automatically cleaned up 7 days after publishing.",
    days: 7,
  },
  {
    id: "30d",
    label: "30 Days",
    durationLabel: "1 Month",
    description: "Full birthday month celebration. Media and recordings retired after 30 days.",
    days: 30,
  },
  {
    id: "1y",
    label: "1 Year",
    durationLabel: "1 Year",
    description: "Preserve every memory and voice note until their next birthday anniversary.",
    days: 365,
  },
  {
    id: "never",
    label: "Never",
    durationLabel: "Permanent Keepsake",
    description: "Permanent digital keepsake. Experience never expires and assets remain accessible indefinitely.",
    days: null,
    badge: "Keepsake",
  },
];

/**
 * Validates and normalizes expiration option with safe fallback to 'never'.
 */
export function normalizeExpirationOption(raw?: string | null): ExpirationOption {
  if (raw === "7d" || raw === "30d" || raw === "1y" || raw === "never") {
    return raw;
  }
  return "never";
}

/**
 * Calculates the exact ISO expires_at timestamp based on the chosen option and base date.
 * Returns null if option is 'never'.
 */
export function calculateExpiresAt(
  option: ExpirationOption = "never",
  fromDate: Date = new Date()
): string | null {
  const normOption = normalizeExpirationOption(option);

  if (normOption === "never") {
    return null;
  }

  const result = new Date(fromDate.getTime());

  switch (normOption) {
    case "7d":
      result.setDate(result.getDate() + 7);
      break;
    case "30d":
      result.setDate(result.getDate() + 30);
      break;
    case "1y":
      // Add exactly 1 calendar year
      result.setFullYear(result.getFullYear() + 1);
      break;
  }

  return result.toISOString();
}

/**
 * Server-side and client-safe check if an experience has reached expiration.
 * - Missing or null expiresAt is treated as NEVER EXPIRED (preserves legacy and permanent experiences).
 * - Future dates return false.
 * - Current or past dates return true.
 */
export function isExperienceExpired(
  expiresAt?: string | null,
  now: Date = new Date()
): boolean {
  if (!expiresAt) {
    return false;
  }

  const expiryTime = new Date(expiresAt).getTime();
  if (Number.isNaN(expiryTime)) {
    return false;
  }

  return expiryTime <= now.getTime();
}

/**
 * Format remaining days/hours until expiration for creator or diagnostic display.
 */
export function formatExpirationRemaining(
  expiresAt?: string | null,
  now: Date = new Date()
): string {
  if (!expiresAt) {
    return "Never expires";
  }

  const diffMs = new Date(expiresAt).getTime() - now.getTime();
  if (diffMs <= 0) {
    return "Expired";
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 1) {
    return `${days} days remaining`;
  }
  if (days === 1) {
    return `1 day remaining`;
  }
  if (hours > 0) {
    return `${hours} hours remaining`;
  }
  return "Expiring shortly";
}
