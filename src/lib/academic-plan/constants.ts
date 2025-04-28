// src/lib/academic-plan/constants.ts
export const YEAR_LIMITS = {
  ABSOLUTE_MAX: 8,
  RECOMMENDED_MAX: 4,
};

export const SEMESTER_CREDIT_LIMITS = {
  MAX_CREDITS_SUMMER: 3,
  MAX_CREDITS_REGULAR: 5,
  MAX_CREDITS_REGULAR_ENG: 6, // Engineering majors get higher limits
};

// Category color mapping for UI
export const CATEGORY_COLORS = {
  "Required Major Classes": "#4A90E2",
  "Major Electives": "#50E3C2",
  "Humanities & Social Sciences": "#F5A623",
  "Mathematics & Quantitative": "#7ED321",
  Business: "#D0021B",
  Computing: "#9013FE",
  Science: "#BD10E0",
  Capstone: "#8B572A",
  "Non-Major Electives": "#9B9B9B",
  "Research / Project Prep.": "#417505",
};

// Engineering majors for special credit limit handling
export const ENGINEERING_MAJORS = ["CE", "EE", "ME"];

// Cache TTL (in milliseconds)
export const CACHE_TTL = {
  PREREQUISITE_DATA: 24 * 60 * 60 * 1000, // 24 hours
  STUDENT_PROFILE: 5 * 60 * 1000, // 5 minutes
  ACADEMIC_PLAN: 5 * 60 * 1000, // 5 minutes
  AVAILABLE_COURSES: 5 * 60 * 1000,
  REMAINING_REQUIREMENTS: 5 * 60 * 1000,
};

// Helper function to get parent category
export function getCategoryParent(categoryName: string | null): string {
  if (!categoryName) return "GENERAL";

  const CATEGORY_PARENTS: Record<string, string> = {
    "Humanities & Social Sciences": "LIBERAL ARTS & SCIENCES CORE",
    Business: "LIBERAL ARTS & SCIENCES CORE",
    "Mathematics & Quantitative": "LIBERAL ARTS & SCIENCES CORE",
    Computing: "LIBERAL ARTS & SCIENCES CORE",
    Science: "LIBERAL ARTS & SCIENCES CORE",
    "Research / Project Prep.": "LIBERAL ARTS & SCIENCES CORE",
    "Non-Major Electives": "LIBERAL ARTS & SCIENCES CORE",
    "Required Major Classes": "MAJOR",
    "Major Electives": "MAJOR",
    Capstone: "MAJOR",
  };

  return CATEGORY_PARENTS[categoryName] || "GENERAL";
}

// Semester name conversion
export function getSemesterName(semester: number, isSummer?: boolean): string {
  if (isSummer || semester === 3) return "Summer";
  return semester === 1 ? "Fall" : "Spring";
}
