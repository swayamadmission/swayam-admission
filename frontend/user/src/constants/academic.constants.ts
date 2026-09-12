export const EDUCATION_LEVELS = [
  "10th",
  "12th",
  "Diploma",
  "Undergraduate",
  "Postgraduate",
  "Other",
] as const;

export const STREAMS = [
  "Science",
  "Commerce",
  "Arts",
  "Vocational",
  "Other",
  "Not Applicable",
] as const;

export const BUDGET_OPTIONS = [
  "Below ₹1L",
  "₹1L–₹2L",
  "₹2L–₹3L",
  "₹3L–₹5L",
  "₹5L+",
] as const;

/**
 * Dynamically computes passing years relative to the current system year.
 * Future-proof: In 2026 it produces [2028, 2027, 2026, 2025, ..., 2014],
 * in 2027 it automatically produces [2029, 2028, 2027, ...], requiring 0 manual code updates.
 */
export function getDynamicPassingYears(): number[] {
  const currentYear = new Date().getFullYear();
  const maxYear = currentYear + 2; // e.g. 2028 when currentYear is 2026
  const totalYears = 16;
  return Array.from({ length: totalYears }, (_, i) => maxYear - i);
}

export const EDUCATION_LEVEL_STREAMS: Record<string, string[]> = {
  "10th": ["General / All Subjects", "Not Applicable"],
  "12th": [
    "Science",
    "Commerce",
    "Humanity / Arts",
  ],
  Diploma: [
    "Engineering / Polytechnic",
    "Medical / Paramedical",
    "Pharmacy",
    "Hotel Management",
    "Design & Fashion",
    "Other",
  ],
  Undergraduate: [
    "Engineering & Technology",
    "Management",
    "Commerce",
    "Science",
    "Humanity / Arts",
    "Computer Applications",
    "Medical & Allied Health",
    "Pharmacy",
    "Law",
    "Design",
    "Hotel Management",
    "Other",
  ],
  Postgraduate: [
    "Management",
    "Engineering & Technology",
    "Computer Applications",
    "Commerce",
    "Science",
    "Humanity / Arts",
    "Pharmacy",
    "Law",
    "Other",
  ],
  Other: ["General", "Other"],
};

export function getStreamsForEducationLevel(level?: string): string[] {
  if (!level) return [...STREAMS];
  const trimmed = level.trim();
  if (EDUCATION_LEVEL_STREAMS[trimmed]) {
    return EDUCATION_LEVEL_STREAMS[trimmed];
  }
  const lower = trimmed.toLowerCase();
  if (lower.includes("10") || lower === "tenth") return EDUCATION_LEVEL_STREAMS["10th"];
  if (lower.includes("diploma") || lower === "polytechnic") return EDUCATION_LEVEL_STREAMS["Diploma"];
  if (lower.includes("12") || lower === "twelfth") return EDUCATION_LEVEL_STREAMS["12th"];
  if (lower.includes("undergrad") || lower === "ug" || lower === "graduation") return EDUCATION_LEVEL_STREAMS["Undergraduate"];
  if (lower.includes("postgrad") || lower === "pg") return EDUCATION_LEVEL_STREAMS["Postgraduate"];
  return [...STREAMS];
}


