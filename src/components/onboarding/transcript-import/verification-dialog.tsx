// src/components/onboarding/transcript-import/verification-dialog.tsx
import {
  AlertCircle,
  FileSpreadsheet,
  GraduationCap,
  School,
  User,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SemesterMapping, StudentProfileData } from "@/lib/types/transcript";

import { SemesterMappingVerification } from "./semester-mapping-verification";

interface VerificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mappings: SemesterMapping[];
  studentProfile: StudentProfileData;
  verificationToken?: string;
  onConfirm: (mappings: SemesterMapping[]) => void;
  onUpdate?: (mappings: SemesterMapping[]) => void;
}

export function VerificationDialog({
  isOpen,
  onClose,
  mappings,
  studentProfile,
  verificationToken,
  onConfirm,
  onUpdate,
}: VerificationDialogProps) {
  const handleMappingUpdate = (updatedMappings: SemesterMapping[]) => {
    if (onUpdate) {
      onUpdate(updatedMappings);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Verify Your Academic Information
          </DialogTitle>
          <DialogDescription>
            Please review the information extracted from your transcript before
            finalizing the import.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="p-4">
            <CardTitle className="mb-4 flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              Student Information
            </CardTitle>
            <CardContent className="p-0">
              <dl className="space-y-2">
                <div className="flex items-start justify-between gap-2 py-1">
                  <dt className="font-medium text-muted-foreground">
                    Student ID:
                  </dt>
                  <dd className="text-right">{studentProfile.studentId}</dd>
                </div>
                <div className="flex items-start justify-between gap-2 py-1">
                  <dt className="font-medium text-muted-foreground">Name:</dt>
                  <dd className="text-right">{studentProfile.name}</dd>
                </div>
                <div className="flex items-start justify-between gap-2 py-1">
                  <dt className="font-medium text-muted-foreground">Major:</dt>
                  <dd className="text-right">
                    <Badge variant="outline">{studentProfile.major}</Badge>
                  </dd>
                </div>
                {studentProfile.mathTrackName && (
                  <div className="flex items-start justify-between gap-2 py-1">
                    <dt className="font-medium text-muted-foreground">
                      Math Track:
                    </dt>
                    <dd className="text-right">
                      <Badge variant="outline">
                        {studentProfile.mathTrackName}
                      </Badge>
                    </dd>
                  </div>
                )}
                <div className="flex items-start justify-between gap-2 py-1">
                  <dt className="font-medium text-muted-foreground">GPA:</dt>
                  <dd className="text-right">
                    {studentProfile.cumulativeGpa || "N/A"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-2 py-1">
                  <dt className="font-medium text-muted-foreground">
                    Credit Hours:
                  </dt>
                  <dd className="text-right">
                    {studentProfile.creditHours || "N/A"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-2 py-1">
                  <dt className="font-medium text-muted-foreground">
                    Admitted:
                  </dt>
                  <dd className="text-right">
                    {studentProfile.dateOfAdmission || "N/A"}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card className="p-4">
            <CardTitle className="mb-4 flex items-center gap-2 text-lg">
              <FileSpreadsheet className="h-5 w-5" />
              Transcript Summary
            </CardTitle>
            <CardContent className="p-0">
              <dl className="space-y-2">
                <div className="flex items-start justify-between gap-2 py-1">
                  <dt className="font-medium text-muted-foreground">
                    Semesters:
                  </dt>
                  <dd className="text-right">{mappings.length}</dd>
                </div>
                <div className="flex items-start justify-between gap-2 py-1">
                  <dt className="font-medium text-muted-foreground">
                    Total Courses:
                  </dt>
                  <dd className="text-right">
                    {mappings.reduce((sum, m) => sum + m.courseCount, 0)}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-2 py-1">
                  <dt className="font-medium text-muted-foreground">
                    Academic Timeline:
                  </dt>
                  <dd className="text-right">
                    {mappings.length > 0
                      ? `${mappings[0].academicYearRange} to ${mappings[mappings.length - 1].academicYearRange}`
                      : "N/A"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-2 py-1">
                  <dt className="font-medium text-muted-foreground">
                    Current Year:
                  </dt>
                  <dd className="text-right">
                    Year {studentProfile.currentYear}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-2 py-1">
                  <dt className="font-medium text-muted-foreground">
                    Current Semester:
                  </dt>
                  <dd className="text-right">
                    Semester {studentProfile.currentSemester}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>

        <div className="mt-4">
          <div className="mb-4 rounded-md bg-blue-50 p-3 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium">
                  Please verify your semester mappings
                </p>
                <p>
                  Make sure each semester is correctly assigned to the right
                  program year and semester. This affects how your courses are
                  displayed in your academic plan.
                </p>
              </div>
            </div>
          </div>

          <SemesterMappingVerification
            mappings={mappings}
            onConfirm={onConfirm}
            onUpdate={handleMappingUpdate}
          />
        </div>

        <DialogFooter className="mt-6">
          <Button onClick={() => onConfirm(mappings)} variant="default">
            Confirm and Complete Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
