// src/components/degree-audit/year-view/year-column.tsx
import { Semester } from "@/lib/academic-plan/types";

import { SemesterPanel } from "./semester-panel";

interface YearColumnProps {
  year: number;
  fall: Semester;
  spring: Semester;
  summer?: Semester;
  currentYear: number;
  currentSemester: number;
}

export function YearColumn({
  year,
  fall,
  spring,
  summer,
  currentYear,
  currentSemester,
}: YearColumnProps) {
  // Create a safe summer object if one wasn't provided
  const safeSummer = summer || {
    year,
    semester: 3,
    courses: [],
    name: "Summer",
    totalCredits: 0,
    hasCreditWarning: false,
    isSummer: true,
  };

  // Determine if we should show the summer semester
  // Only show if it has courses OR if we're in/before the current year and semester
  const showSummer =
    safeSummer.courses.length > 0 ||
    (year >= currentYear && currentSemester < 3);

  // Check if this is the current year (for highlighting)
  const isCurrentYear = year === currentYear;

  return (
    <div className="flex-1">
      <h3
        className={`mb-2 body1-medium ${isCurrentYear ? "text-primary font-bold" : ""}`}
      >
        Year {year}
        {isCurrentYear && (
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            (Current)
          </span>
        )}
      </h3>
      <div className="flex flex-col w-[320px] space-y-4">
        <SemesterPanel
          year={fall.year}
          semester={fall.semester}
          name={fall.name || "Fall"}
          courses={fall.courses}
          totalCredits={fall.totalCredits}
          hasCreditWarning={fall.hasCreditWarning}
          isSummer={false}
          currentYear={currentYear}
          currentSemester={currentSemester}
        />

        <SemesterPanel
          year={spring.year}
          semester={spring.semester}
          name={spring.name || "Spring"}
          courses={spring.courses}
          totalCredits={spring.totalCredits}
          hasCreditWarning={spring.hasCreditWarning}
          isSummer={false}
          currentYear={currentYear}
          currentSemester={currentSemester}
        />

        {showSummer && (
          <SemesterPanel
            year={safeSummer.year}
            semester={safeSummer.semester}
            name={safeSummer.name || "Summer"}
            courses={safeSummer.courses}
            totalCredits={safeSummer.totalCredits}
            hasCreditWarning={safeSummer.hasCreditWarning}
            isSummer={true}
            currentYear={currentYear}
            currentSemester={currentSemester}
          />
        )}
      </div>
    </div>
  );
}
