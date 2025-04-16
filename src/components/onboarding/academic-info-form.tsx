"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { UseFormReturn, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AcademicInfo,
  academicInfoSchema,
  useOnboardingStore,
} from "@/lib/onboarding/onboarding-store";

interface AcademicInfoFormProps {
  onSubmit: (data: AcademicInfo) => void;
  onBack: () => void;
}

export function AcademicInfoForm({ onSubmit, onBack }: AcademicInfoFormProps) {
  const { academicInfo, setAcademicInfo } = useOnboardingStore();

  // Set up forms
  const academicForm = useForm<AcademicInfo>({
    resolver: zodResolver(academicInfoSchema),
    defaultValues: academicInfo || {
      currentYear: "" as any, // Telling typescript that Hey, it's okay, I know what I'm doing.
      currentSemester: "" as any,
      yearGroup: "",
    },
  });

  // Get access to the onboarding store

  // Get current year for year group suggestions
  const currentYear = new Date().getFullYear();
  const suggestedYearGroups = [
    currentYear,
    currentYear + 1,
    currentYear + 2,
    currentYear + 3,
  ];
  return (
    <Card className="w-full max-w-lg border-2 border-primary/10 shadow-lg">
      <CardHeader>
        <CardTitle className="text-center">Academic Year Information</CardTitle>
        <CardDescription className="text-center">
          This helps us customize your degree audit and course planning
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...academicForm}>
          <form
            onSubmit={academicForm.handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <FormField
              control={academicForm.control}
              name="currentYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="body2-medium">Current Year</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="h-12 rounded-lg bg-white dark:bg-[--background]">
                        <SelectValue placeholder="Select your current year" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">Year 1</SelectItem>
                      <SelectItem value="2">Year 2</SelectItem>
                      <SelectItem value="3">Year 3</SelectItem>
                      <SelectItem value="4">Year 4</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Your current year in the program
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={academicForm.control}
              name="currentSemester"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="body2-medium">
                    Current Semester
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="h-12 rounded-lg bg-white dark:bg-[--background]">
                        <SelectValue placeholder="Select current semester" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Fall">Fall</SelectItem>
                      <SelectItem value="Spring">Spring</SelectItem>
                      <SelectItem value="Summer">Summer</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The current academic semester
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={academicForm.control}
              name="yearGroup"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="body2-medium">Year Group</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., 2025"
                      className="h-12 rounded-lg bg-white dark:bg-[--background]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The year your class will graduate (e.g., Class of 2025)
                  </FormDescription>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {suggestedYearGroups.map((year) => (
                      <Button
                        key={year}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          academicForm.setValue("yearGroup", year.toString())
                        }
                        className="h-auto px-2 py-1 text-xs"
                      >
                        {year}
                      </Button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={onBack}>
                <ChevronLeft className="mr-2 size-4" />
                Back
              </Button>
              <Button type="submit" className="body2-medium rounded-[50px]">
                Next: Program Information
                <ChevronRight className="ml-2 size-4" />
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
