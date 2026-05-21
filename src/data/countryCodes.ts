export type CountryCode = {
  code: string; // dial code, e.g. "+91"
  country: string; // ISO 2-letter, for accessibility
  name: string; // display name
  flag: string; // emoji flag (decorative only)
};

export const COUNTRY_CODES: CountryCode[] = [
  { code: "+91", country: "IN", name: "India", flag: "🇮🇳" },
  { code: "+1", country: "US", name: "United States", flag: "🇺🇸" },
  { code: "+44", country: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "+971", country: "AE", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "+966", country: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+65", country: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "+61", country: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "+1", country: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "+49", country: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "+33", country: "FR", name: "France", flag: "🇫🇷" },
  { code: "+81", country: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "+86", country: "CN", name: "China", flag: "🇨🇳" },
  { code: "+880", country: "BD", name: "Bangladesh", flag: "🇧🇩" },
  { code: "+92", country: "PK", name: "Pakistan", flag: "🇵🇰" },
  { code: "+94", country: "LK", name: "Sri Lanka", flag: "🇱🇰" },
  { code: "+977", country: "NP", name: "Nepal", flag: "🇳🇵" },
  { code: "+60", country: "MY", name: "Malaysia", flag: "🇲🇾" },
  { code: "+63", country: "PH", name: "Philippines", flag: "🇵🇭" },
  { code: "+27", country: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "+254", country: "KE", name: "Kenya", flag: "🇰🇪" },
  { code: "+234", country: "NG", name: "Nigeria", flag: "🇳🇬" }
];

export const DEFAULT_COUNTRY_CODE = "+91";

// Build a WhatsApp-friendly "phone" param: digits-only with country code, no plus.
export const buildWhatsAppPhone = (
  countryCode: string | undefined,
  number: string | undefined
): string | null => {
  if (!number) return null;
  const cc = (countryCode ?? "").replace(/\D/g, "");
  const local = number.replace(/\D/g, "");
  if (!cc || !local) return null;
  return `${cc}${local}`;
};
