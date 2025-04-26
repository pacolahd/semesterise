import { useEffect, useState } from "react";

import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useAddCourse,
  useAddPlaceholderElective,
  useAvailableCourses,
  useAvailableElectiveCategories,
} from "@/lib/academic-plan/academic-plan-hooks";
import { SemesterAvailableCourses } from "@/lib/academic-plan/types";
import { useAuthStore } from "@/lib/auth/auth-store";
import { cn } from "@/lib/utils";

interface CourseAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  semester: number;
  onSuccess: () => Promise<void>;
}

export function CourseAddDialog({
  open,
  onOpenChange,
  year,
  semester,
  onSuccess,
}: CourseAddDialogProps) {
  const { user } = useAuthStore();
  const [openCombobox, setOpenCombobox] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<
    SemesterAvailableCourses[0] | null
  >(null);
  const [title, setTitle] = useState("Elective Course");
  const [credits, setCredits] = useState("1");
  const [category, setCategory] = useState("Non-Major Electives");
  const [activeTab, setActiveTab] = useState("course");

  const semesterName =
    semester === 1 ? "Fall" : semester === 2 ? "Spring" : "Summer";
  const isSummer = semester === 3;

  // Course selection hooks
  const {
    data: courses = [],
    isLoading: isLoadingCourses,
    error: coursesError,
  } = useAvailableCourses(user?.id, year, semester);

  const addCourseMutation = useAddCourse();

  // Elective placeholder hooks
  const { data: categoryOptions, isLoading: isLoadingCategories } =
    useAvailableElectiveCategories(user?.id);
  const addPlaceholderMutation = useAddPlaceholderElective();

  useEffect(() => {
    if (!open) {
      setSelectedCourse(null);
      setActiveTab("course");
      setTitle("Elective Course");
      setCredits("1");
      setCategory("Non-Major Electives");
    }
  }, [open]);

  useEffect(() => {
    if (coursesError) {
      console.error("Error loading courses:", coursesError);
    }
  }, [coursesError]);

  const handleAddCourse = async () => {
    if (!selectedCourse || !user?.id) {
      if (!user?.id) {
        toast.error(
          "Student ID not found. Please refresh the page or contact support."
        );
      }
      return;
    }

    addCourseMutation.mutate(
      {
        authId: user.id,
        courseCode: selectedCourse.code,
        year,
        semester,
      },
      {
        onSuccess: async () => {
          toast.success(
            `Added ${selectedCourse.code} to ${semesterName} Year ${year}`
          );
          onOpenChange(false);
          await onSuccess();
        },
      }
    );
  };

  const handleAddPlaceholder = async () => {
    if (!user?.id) return;

    try {
      await addPlaceholderMutation.mutateAsync({
        authId: user.id,
        title,
        credits: parseFloat(credits),
        year,
        semester,
        category,
      });

      onOpenChange(false);
      await onSuccess();
    } catch (error) {
      console.error("Error adding placeholder:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Add to {semesterName} Year {year}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="course">Course</TabsTrigger>
            <TabsTrigger value="placeholder">Elective Placeholder</TabsTrigger>
          </TabsList>

          <TabsContent value="course">
            <div className="space-y-4 py-4">
              {isLoadingCourses ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Loading courses...</span>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Popover
                      open={openCombobox}
                      onOpenChange={setOpenCombobox}
                      modal
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openCombobox}
                          className="w-full justify-between"
                        >
                          {selectedCourse
                            ? `${selectedCourse.code} - ${selectedCourse.title}`
                            : "Select a course"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[400px] p-0"
                        align="start"
                        onInteractOutside={(e) => e.preventDefault()}
                      >
                        <Command>
                          <CommandInput placeholder="Search for a course..." />
                          <CommandList>
                            <CommandEmpty>No courses found.</CommandEmpty>
                            <CommandGroup>
                              {courses.map((course) => (
                                <CommandItem
                                  key={course.code}
                                  value={`${course.code} ${course.title}`}
                                  onSelect={() => {
                                    setSelectedCourse(course);
                                    setOpenCombobox(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedCourse?.code === course.code
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  <span className="mr-2 font-medium">
                                    {course.code}
                                  </span>
                                  <span className="truncate text-sm text-muted-foreground">
                                    {course.title}
                                  </span>
                                  {!course.offeredInSemester && isSummer && (
                                    <span className="ml-2 text-xs text-amber-500">
                                      !
                                    </span>
                                  )}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>

                    {selectedCourse && (
                      <div className="mt-4 rounded-md border bg-muted p-3">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="font-medium">
                            {selectedCourse.code}
                          </span>
                          <span className="text-sm">
                            {selectedCourse.credits} credits
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {selectedCourse.title}
                        </p>
                        <div className="mt-2 text-xs">
                          Category: {selectedCourse.category}
                        </div>
                        {!selectedCourse.offeredInSemester && isSummer && (
                          <p className="mt-2 text-xs text-amber-500">
                            Note: This course may not be typically offered in
                            Summer
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!selectedCourse || addCourseMutation.isPending}
                onClick={handleAddCourse}
              >
                {addCourseMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Course"
                )}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="placeholder">
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="category">Elective Category</Label>
                {isLoadingCategories ? (
                  <div className="flex items-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Loading categories...</span>
                  </div>
                ) : (
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions?.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Elective Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Major Elective"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="credits">Credits</Label>
                <Input
                  id="credits"
                  type="number"
                  min="0.5"
                  max="5"
                  step="0.5"
                  value={credits}
                  onChange={(e) => setCredits(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddPlaceholder}
                disabled={addPlaceholderMutation.isPending}
              >
                {addPlaceholderMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Placeholder"
                )}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
