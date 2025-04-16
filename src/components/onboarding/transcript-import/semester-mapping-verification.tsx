// src/components/onboarding/transcript-import/semester-mapping-verification.tsx
import { useState } from "react";

import { AlertTriangle, Calendar, CalendarDays, School } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SemesterMapping } from "@/lib/onboarding/transcript-import/transcript-import-types";

interface SemesterMappingVerificationProps {
  mappings: SemesterMapping[];
  onConfirm: (mappings: SemesterMapping[]) => void;
  onUpdate: (mappings: SemesterMapping[]) => void;
  isReadOnly?: boolean;
}

export function SemesterMappingVerification({
  mappings,
  onConfirm,
  onUpdate,
  isReadOnly = false,
}: SemesterMappingVerificationProps) {
  const [editedMappings, setEditedMappings] =
    useState<SemesterMapping[]>(mappings);
  const [hasChanges, setHasChanges] = useState(false);

  // Special case indicator for Semester 3 2023-2024
  const hasSpecialSemester3 = editedMappings.some(
    (mapping) =>
      mapping.camuSemesterName.includes("Semester 3") &&
      mapping.camuSemesterName.includes("2023-2024")
  );

  const handleProgramYearChange = (index: number, value: string) => {
    if (isReadOnly) return;

    const updated = [...editedMappings];
    updated[index].programYear = parseInt(value);
    setEditedMappings(updated);
    setHasChanges(true);
  };

  const handleProgramSemesterChange = (index: number, value: string) => {
    if (isReadOnly) return;

    const updated = [...editedMappings];
    updated[index].programSemester = parseInt(value);
    setEditedMappings(updated);
    setHasChanges(true);
  };

  const handleSummerToggle = (index: number, value: boolean) => {
    if (isReadOnly) return;

    const updated = [...editedMappings];
    updated[index].isSummer = value;

    // If toggling to summer, clear the program semester
    if (value) {
      updated[index].programSemester = 0;
    } else {
      // If toggling from summer to regular, set a default program semester
      updated[index].programSemester = 1;
    }

    setEditedMappings(updated);
    setHasChanges(true);
  };

  const handleSave = () => {
    onUpdate(editedMappings);
    setHasChanges(false);
  };

  const handleConfirm = () => {
    onConfirm(editedMappings);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <School className="h-5 w-5" />
          Academic Timeline Verification
        </CardTitle>
        <CardDescription>
          Verify how your CAMU semesters map to your program years
        </CardDescription>
      </CardHeader>

      {hasSpecialSemester3 && (
        <div className="mx-6 mb-4 flex items-start gap-2 rounded-md bg-amber-50 p-3 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Note about Semester 3 2023-2024</p>
            <p>
              This semester is marked as a regular semester, not a summer term,
              according to Ashesi's academic calendar for 2024.
            </p>
          </div>
        </div>
      )}

      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CAMU Semester</TableHead>
                <TableHead>Program Year</TableHead>
                <TableHead>Semester</TableHead>
                <TableHead>Summer Term</TableHead>
                <TableHead className="text-right">Courses</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {editedMappings.map((mapping, index) => (
                <TableRow
                  key={index}
                  className={mapping.isSummer ? "bg-muted/50" : ""}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {mapping.camuSemesterName}
                    </div>
                  </TableCell>
                  <TableCell>
                    {isReadOnly ? (
                      <span>Year {mapping.programYear}</span>
                    ) : (
                      <Select
                        value={mapping.programYear.toString()}
                        onValueChange={(v) => handleProgramYearChange(index, v)}
                        disabled={isReadOnly}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Year 1</SelectItem>
                          <SelectItem value="2">Year 2</SelectItem>
                          <SelectItem value="3">Year 3</SelectItem>
                          <SelectItem value="4">Year 4</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    {isReadOnly ? (
                      mapping.isSummer ? (
                        <span className="text-muted-foreground">
                          N/A (Summer)
                        </span>
                      ) : (
                        <span>Semester {mapping.programSemester}</span>
                      )
                    ) : (
                      <Select
                        value={mapping.programSemester?.toString() || "0"}
                        onValueChange={(v) =>
                          handleProgramSemesterChange(index, v)
                        }
                        disabled={isReadOnly || mapping.isSummer}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="N/A (Summer)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Semester 1</SelectItem>
                          <SelectItem value="2">Semester 2</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {isReadOnly ? (
                        <span>{mapping.isSummer ? "Yes" : "No"}</span>
                      ) : (
                        <>
                          <Switch
                            checked={mapping.isSummer}
                            onCheckedChange={(v) =>
                              handleSummerToggle(index, v)
                            }
                            disabled={
                              isReadOnly ||
                              // Special case: Cannot change Semester 3 2023-2024
                              (mapping.camuSemesterName.includes(
                                "Semester 3"
                              ) &&
                                mapping.camuSemesterName.includes("2023-2024"))
                            }
                          />
                          <Label>{mapping.isSummer ? "Yes" : "No"}</Label>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {mapping.courseCount}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between">
        {!isReadOnly && (
          <>
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={!hasChanges}
            >
              Save Changes
            </Button>
            <Button onClick={handleConfirm}>Confirm and Continue</Button>
          </>
        )}
        {isReadOnly && (
          <Button onClick={handleConfirm} className="ml-auto">
            Continue
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
