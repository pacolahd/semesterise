"use client";

import { useEffect, useState } from "react";

import { Check, ChevronsUpDown, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getAvailableCourses } from "@/lib/degree-audit/dummy-data";
import { Course, CourseStatus } from "@/lib/degree-audit/types";
import { cn } from "@/lib/utils";

interface AddCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCourseAdded: (course: Course) => void;
  semesterId: string | null;
}

export function AddCourseDialog({
  open,
  onOpenChange,
  onCourseAdded,
  semesterId,
}: AddCourseDialogProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // Load available courses
  useEffect(() => {
    if (open && semesterId) {
      const courses = getAvailableCourses();
      setAvailableCourses(courses);
    } else {
      // Reset state when dialog closes
      setSearchValue("");
      setSelectedCourse(null);
    }
  }, [open, semesterId]);

  // Handle adding the selected course
  const handleAddCourse = () => {
    if (selectedCourse) {
      // Create a copy with PLANNED status and generate a unique ID
      const newCourse = {
        ...selectedCourse,
        id: `course-${selectedCourse.code}-${Date.now()}`, // Ensure unique ID
        status: "PLANNED" as CourseStatus,
      };

      onCourseAdded(newCourse);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Course to Semester</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={searchOpen}
                  className="w-full justify-between"
                >
                  {selectedCourse
                    ? `${selectedCourse.code} - ${selectedCourse.title}`
                    : "Search for a course..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0">
                <Command>
                  <CommandInput
                    placeholder="Search courses..."
                    value={searchValue}
                    onValueChange={setSearchValue}
                    className="h-9"
                  />
                  <CommandList>
                    <CommandEmpty>No courses found.</CommandEmpty>
                    <CommandGroup>
                      {availableCourses.map((course) => (
                        <CommandItem
                          key={course.id}
                          value={`${course.code} ${course.title}`}
                          onSelect={() => {
                            setSelectedCourse(course);
                            setSearchOpen(false);
                          }}
                        >
                          <div className="flex flex-col">
                            <div className="flex items-center">
                              <span className="mr-2 font-medium">
                                {course.code}
                              </span>
                              <span className="text-sm">{course.title}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {course.category} • {course.credits} credits
                            </span>
                          </div>
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4",
                              selectedCourse?.id === course.id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddCourse} disabled={!selectedCourse}>
                Add Course
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
