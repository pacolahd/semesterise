import { useEffect, useRef, useState } from "react";

import { AlertCircle, BookOpen, Loader2, PlusCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import MultipleSelector, {
  MultipleSelectorRef,
  Option,
} from "@/components/ui/multiple-selector";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useAddCourse,
  useAddPlaceholderElective,
  useAvailableCourses,
  useAvailableElectiveCategories,
} from "@/lib/academic-plan/academic-plan-hooks";
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
  const [selectedCourses, setSelectedCourses] = useState<Option[]>([]);
  const courseSelectorRef = useRef<MultipleSelectorRef>(null);

  // State for placeholder tab
  const [title, setTitle] = useState("Elective Course");
  const [credits, setCredits] = useState("1");
  const [category, setCategory] = useState("Non-Major Electives");
  const [activeTab, setActiveTab] = useState("course");
  const [isAddingCourses, setIsAddingCourses] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);

  const semesterName =
    semester === 1 ? "Fall" : semester === 2 ? "Spring" : "Summer";
  const isSummer = semester === 3;

  // Course selection hooks
  const {
    data: availableCourses = [],
    isLoading: isLoadingCourses,
    error: coursesError,
  } = useAvailableCourses(user?.id, year, semester);
  interface CourseOption extends Option {
    credits: string;
    category: string;
    offeredInSemester?: boolean;
    isRetake?: boolean;
    retakeReason?: string;
  }
  // Convert available courses to options for MultipleSelector - KEEPING THIS EXACTLY AS ORIGINAL
  const courseOptions: CourseOption[] = availableCourses.map((course) => ({
    value: course.code,
    label: `${course.code} - ${course.title}`,
    credits: course.credits.toString(),
    category: course.category,
    offeredInSemester: course.offeredInSemester,
    isRetake: course.isRetake,
    retakeReason: course.retakeReason,
  }));

  const addCourseMutation = useAddCourse();
  const { data: categoryOptions = [], isLoading: isLoadingCategories } =
    useAvailableElectiveCategories(user?.id);
  const addPlaceholderMutation = useAddPlaceholderElective();

  useEffect(() => {
    if (!open) {
      setSelectedCourses([]);
      setActiveTab("course");
      setTitle("Elective Course");
      setCredits("1");
      setCategory("Non-Major Electives");
      setProcessingStatus(null);
    }
  }, [open]);

  useEffect(() => {
    if (coursesError) {
      console.error("Error loading courses:", coursesError);
    }
  }, [coursesError]);

  // Sync search function for MultipleSelector - KEEPING THIS EXACTLY AS ORIGINAL
  const handleSyncSearch = (search: string) => {
    if (!search) return courseOptions;

    return courseOptions.filter((option) =>
      option.label.toLowerCase().includes(search.toLowerCase())
    );
  };

  const handleAddCourses = async () => {
    if (!user?.id || selectedCourses.length === 0) {
      if (!user?.id) {
        toast.error(
          "Student ID not found. Please refresh the page or contact support."
        );
      }
      return;
    }

    setIsAddingCourses(true);
    let successCount = 0;
    let failCount = 0;
    const totalCourses = selectedCourses.length;

    try {
      // Process courses one by one
      for (let i = 0; i < selectedCourses.length; i++) {
        const course = selectedCourses[i];
        setProcessingStatus(
          `Adding ${course.value}... (${i + 1}/${totalCourses})`
        );

        try {
          await addCourseMutation.mutateAsync({
            authId: user.id,
            courseCode: course.value,
            year,
            semester,
          });
          successCount++;
        } catch (error) {
          failCount++;
          console.error(`Failed to add course ${course.value}:`, error);
        }
      }

      // Show appropriate message
      if (successCount > 0 && failCount === 0) {
        toast.success(
          `Added ${successCount} course${successCount > 1 ? "s" : ""} to ${semesterName} Year ${year}`
        );
      } else if (successCount > 0 && failCount > 0) {
        toast.warning(
          `Added ${successCount} course${successCount > 1 ? "s" : ""}, but ${failCount} failed. Check for conflicts or prerequisites.`
        );
      } else {
        toast.error("Failed to add any courses. Please try again.");
      }

      if (successCount > 0) {
        onOpenChange(false);
        await onSuccess();
      }
    } catch (error) {
      toast.error("An error occurred while adding courses");
      console.error(error);
    } finally {
      setIsAddingCourses(false);
      setProcessingStatus(null);
    }
  };

  const handleAddPlaceholder = async () => {
    if (!user?.id) return;

    try {
      setIsAddingCourses(true);
      await addPlaceholderMutation.mutateAsync({
        authId: user.id,
        title,
        credits: parseFloat(credits),
        year,
        semester,
        category,
      });

      toast.success(
        `Added "${title}" placeholder to ${semesterName} Year ${year}`
      );
      onOpenChange(false);
      await onSuccess();
    } catch (error) {
      console.error("Error adding placeholder:", error);
      toast.error("Failed to add placeholder");
    } finally {
      setIsAddingCourses(false);
    }
  };

  // Generate a summary of selected courses
  const getTotalCredits = () => {
    return selectedCourses.reduce((total, course) => {
      return total + parseFloat((course.credits as string) || "0");
    }, 0);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => !isAddingCourses && onOpenChange(open)}
    >
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col overflow-hidden ">
        <DialogHeader className="px-1">
          <DialogTitle className="text-xl">
            Add to {semesterName} Year {year}
          </DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="grid w-full grid-cols-2 mb-2">
            <TabsTrigger value="course" disabled={isAddingCourses}>
              <BookOpen className="h-4 w-4 mr-2" />
              Courses
            </TabsTrigger>
            <TabsTrigger value="placeholder" disabled={isAddingCourses}>
              <div className="w-4 h-4 border-dashed border-2 border-muted-foreground rounded-sm mr-2" />
              Elective Placeholder
            </TabsTrigger>
          </TabsList>

          <TabsContent value="course" className="flex-1 flex flex-col">
            <ScrollArea className="flex-1 pr-4 -mr-4 ">
              <div className="space-y-4">
                {isLoadingCourses ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Loading available courses...
                    </p>
                  </div>
                ) : (
                  <>
                    <div
                      className={cn(
                        "space-y-2",
                        selectedCourses.length === 0 &&
                          !isLoadingCourses &&
                          courseOptions.length !== 0 &&
                          "min-h-[200px]"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">
                          Select courses to add
                        </Label>
                        {selectedCourses.length > 0 && (
                          <Badge variant="outline" className="font-normal">
                            {selectedCourses.length} selected (
                            {getTotalCredits()} credits)
                          </Badge>
                        )}
                      </div>

                      {/* IMPORTANT: Keep the MultipleSelector exactly as it was originally */}
                      <MultipleSelector
                        maxSelected={3}
                        onMaxSelected={(maxLimit) => {
                          toast.warning(
                            `You can only add ${maxLimit} courses at a time!`
                          );
                        }}
                        ref={courseSelectorRef}
                        options={courseOptions}
                        onSearchSync={handleSyncSearch}
                        placeholder="Search and select courses..."
                        onChange={setSelectedCourses}
                        value={selectedCourses}
                        emptyIndicator={
                          <p className="text-center text-muted-foreground p-2">
                            No matching courses found
                          </p>
                        }
                      />
                    </div>

                    {selectedCourses.length > 0 && (
                      <div className="space-y-2 mt-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">
                            Selected courses
                          </h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => courseSelectorRef.current?.reset()}
                            disabled={isAddingCourses}
                          >
                            Clear all
                          </Button>
                        </div>

                        <div className="max-h-[200px] overflow-y-auto pr-2">
                          {selectedCourses.map((course) => {
                            const originalCourse = courseOptions.find(
                              (c) => c.value === course.value
                            );
                            return (
                              <div
                                key={course.value}
                                className="rounded-md border bg-muted p-3 mt-1"
                              >
                                <div className="mb-1 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">
                                      {course.value}
                                    </span>
                                    {originalCourse?.isRetake && (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger>
                                            <Badge
                                              variant={
                                                originalCourse.retakeReason?.includes(
                                                  "needs"
                                                )
                                                  ? "destructive"
                                                  : "default"
                                              }
                                              className="h-5 px-1.5"
                                            >
                                              {originalCourse.retakeReason?.includes(
                                                "needs"
                                              )
                                                ? "Compulsory Retake"
                                                : "Voluntary Retake"}
                                            </Badge>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p className="max-w-xs">
                                              {originalCourse.retakeReason}
                                            </p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}
                                    {originalCourse?.offeredInSemester ===
                                      false &&
                                      isSummer && (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger>
                                              <AlertCircle className="h-4 w-4 text-amber-500" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>
                                                This course may not be typically
                                                offered in Summer
                                              </p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      )}
                                  </div>
                                  <span className="text-sm">
                                    {originalCourse?.credits} credits
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {course.label.split(" - ")[1]}
                                </p>
                                <div className="mt-2 text-xs">
                                  Category: {originalCourse?.category}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {courseOptions.length === 0 && !isLoadingCourses && (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <BookOpen className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
                        <h3 className="font-medium mb-1">
                          No available courses
                        </h3>
                        <p className="text-sm text-muted-foreground max-w-xs">
                          There are no courses available for this semester that
                          meet your requirements.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>

            <div className="pt-1 mt-1">
              {isAddingCourses && processingStatus && (
                <div className="flex items-center justify-center mb-1">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  <span className="text-sm text-muted-foreground">
                    {processingStatus}
                  </span>
                </div>
              )}

              <Separator className="mb-2" />

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isAddingCourses}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={selectedCourses.length === 0 || isAddingCourses}
                  onClick={handleAddCourses}
                  className="gap-2"
                >
                  {isAddingCourses ? (
                    <Loader2 className="h-1 w-1 animate-spin mr-2" />
                  ) : null}
                  {isAddingCourses
                    ? "Adding..."
                    : `Add ${selectedCourses.length} Course${selectedCourses.length !== 1 ? "s" : ""}`}
                </Button>
              </DialogFooter>
            </div>
          </TabsContent>

          <TabsContent value="placeholder" className="flex-1 flex flex-col">
            <ScrollArea className="flex-1 pr-4 -mr-4">
              <div className="space-y-4">
                <div className="rounded-lg border border-dashed p-4">
                  <h3 className="text-base font-medium mb-1">
                    Elective Placeholder
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add a placeholder for an elective course you plan to take in
                    the future
                  </p>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-sm">
                        Elective Category
                      </Label>
                      {isLoadingCategories ? (
                        <div className="flex items-center h-10">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">
                            Loading categories...
                          </span>
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
                      <Label htmlFor="title" className="text-sm">
                        Title/Description
                      </Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., Major Elective, Humanities Course"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="credits" className="text-sm">
                        Credits
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="credits"
                          type="number"
                          min="0.5"
                          max="5"
                          step="0.5"
                          value={credits}
                          onChange={(e) => setCredits(e.target.value)}
                          className="w-24"
                        />
                        <span className="text-sm text-muted-foreground">
                          credit hours
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div className="pt-4 mt-auto">
              <Separator className="mb-4" />
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={addPlaceholderMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddPlaceholder}
                  disabled={
                    !title || !credits || addPlaceholderMutation.isPending
                  }
                  className="gap-2"
                >
                  {addPlaceholderMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {addPlaceholderMutation.isPending
                    ? "Adding..."
                    : "Add Placeholder"}
                </Button>
              </DialogFooter>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
