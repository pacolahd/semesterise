"use client";

import { useEffect, useState } from "react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ProgramInfo,
  programInfoSchema,
  useOnboardingStore,
} from "@/lib/onboarding/onboarding-store";

// Define major and math track types
interface Major {
  code: string;
  name: string;
}

interface MathTrack {
  name: string;
  description: string;
}

interface ProgramInfoFormProps {
  onSubmit: (data: ProgramInfo) => void;
  onBack: () => void;
  majors: Major[];
  mathTracks: MathTrack[];
}

export function ProgramInfoForm({
  onSubmit,
  onBack,
  majors,
  mathTracks,
}: ProgramInfoFormProps) {
  const [showMathTrack, setShowMathTrack] = useState(false);

  const { programInfo } = useOnboardingStore();

  const programForm = useForm<ProgramInfo>({
    resolver: zodResolver(programInfoSchema),
    defaultValues: programInfo || {
      major: "",
      mathTrack: "",
    },
  });

  // Watch for major changes to determine if math track should be shown
  const selectedMajor = programForm.watch("major");

  useEffect(() => {
    // Show math track selection for non-engineering majors
    if (selectedMajor) {
      const isEngineering = ["CE", "EE", "ME"].includes(selectedMajor);
      setShowMathTrack(!isEngineering);

      // Reset math track if engineering major selected
      if (isEngineering) {
        programForm.setValue("mathTrack", "");
      }
    }
  }, [selectedMajor, programForm]);

  return (
    <Card className="w-full max-w-lg border-2 border-primary/10 shadow-lg">
      <CardHeader>
        <CardTitle className="text-center">Program Information</CardTitle>
        <CardDescription className="text-center">
          This helps us determine your degree requirements
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...programForm}>
          <form
            onSubmit={programForm.handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <FormField
              control={programForm.control}
              name="major"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="body2-medium">Major</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="h-12 rounded-lg bg-white dark:bg-[--background]">
                        <SelectValue placeholder="Select your major" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {majors.map((major) => (
                        <SelectItem key={major.code} value={major.code}>
                          {major.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Your primary field of study</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showMathTrack && (
              <FormField
                control={programForm.control}
                name="mathTrack"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="body2-medium">
                      Mathematics Track
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-12 rounded-lg bg-white dark:bg-[--background]">
                          <SelectValue placeholder="Select your math track" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {mathTracks.map((track) => (
                          <SelectItem key={track.name} value={track.name}>
                            {track.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Your mathematics specialization (required for
                      non-Engineering majors)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={onBack}>
                <ChevronLeft className="mr-2 size-4" />
                Back
              </Button>
              <Button type="submit" className="body2-medium rounded-[50px]">
                Next: Import Transcript
                <ChevronRight className="ml-2 size-4" />
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
