// src/components/degree-audit/year-view/year-column.tsx
import { Semester } from "@/lib/academic-plan/types";

import { SemesterPanel } from "./semester-panel";

interface YearColumnProps {
  year: number;
  fall: Semester;
  spring: Semester;
  summer: Semester;
}

export function YearColumn({ year, fall, spring, summer }: YearColumnProps) {
  return (
    <div className="flex-1">
      <h3 className="mb-2 text-center text-lg font-semibold">Year {year}</h3>
      <div className="flex flex-col space-y-4">
        <SemesterPanel {...fall} />
        <SemesterPanel {...spring} />
        <SemesterPanel {...summer} />
      </div>
    </div>
  );
}
