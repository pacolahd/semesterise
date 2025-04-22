// src/components/degree-audit/year-view/year-column.tsx
import { Semester } from "@/lib/academic-plan/types";

import { SemesterPanel } from "./semester-panel";

interface YearColumnProps {
  year: number;
  fall: Semester;
  spring: Semester;
  summer: Semester;
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
  return (
    <div className="flex-1">
      <h3 className="mb-2  body1-medium">Year {year}</h3>
      <div className="flex flex-col  w-[320px] space-y-4">
        <SemesterPanel {...fall} />
        <SemesterPanel {...spring} />
        {/*// i don't want to show summer semester if the year has passed and the*/}
        {/*student is in a further year*/}
        {summer.courses.length > 0 ||
          (year >= currentYear && currentSemester < 3 && (
            <SemesterPanel {...summer} />
          ))}
      </div>
    </div>
  );
}
