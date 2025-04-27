// src/components/degree-audit/year-view/year-column.tsx
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
// Use existing Button component
import { Tooltip } from "@/components/ui/tooltip";
import TooltipWrapper from "@/components/ui/tooltip-wrapper";
import { Semester } from "@/lib/academic-plan/types";

import { SemesterPanel } from "./semester-panel";

// Update the Tooltip usage and use standard Button with icon
interface YearColumnProps {
  year: number;
  fall: Semester;
  spring: Semester;
  summer?: Semester;
  currentYear: number;
  currentSemester: number;
  canAddYear: boolean;
  canRemoveYear: boolean;
  onAddYear: () => void;
  onRemoveYear: () => void;
  isLastYear: boolean;
}

export function YearColumn({
  year,
  fall,
  spring,
  summer,
  currentYear,
  currentSemester,
  canAddYear,
  canRemoveYear,
  onAddYear,
  onRemoveYear,
  isLastYear,
}: YearColumnProps) {
  const safeSummer = summer || {
    year,
    semester: 3,
    courses: [],
    name: "Summer",
    totalCredits: 0,
    hasCreditWarning: false,
    isSummer: true,
  };

  const showSummer =
    safeSummer.courses.length > 0 ||
    (year >= currentYear && currentSemester < 3);

  const isCurrentYear = year === currentYear;

  return (
    <div className="flex-1 relative group">
      <div className="flex items-center  mb-2">
        <div className="flex items-center justify-between w-full">
          <h3
            className={`body1-medium ${isCurrentYear ? "text-primary font-bold" : ""}`}
          >
            Year {year}
            {isCurrentYear && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                (Current)
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            {canAddYear && isLastYear && (
              <TooltipWrapper tooltipText="Add a new empty year to your timeline">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onAddYear}
                  className="h-9 w-9 text-green-600 border-green-600 hover:bg-green-100 hover:text-green-700 hover:border-green-700"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </TooltipWrapper>
            )}
            {canRemoveYear && (
              <TooltipWrapper tooltipText="Remove this empty year">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onRemoveYear}
                  className="h-9 w-9 text-red-600 border-red-600 hover:bg-red-100 hover:text-red-700 hover:border-red-700"
                >
                  <X className="h-5 w-5" />
                </Button>
              </TooltipWrapper>
            )}
          </div>
        </div>
      </div>
      {/* Rest of the component remains the same */}
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
