import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { UseFormReturn, useForm } from "react-hook-form";
import { toast } from "sonner";

import { transcriptSchema } from "@/components/onboarding/transcript-import/transcript-import-schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Form, FormField } from "@/components/ui/form";
import { useUpdateUserProfile } from "@/lib/auth/auth-hooks";
import { useAuthStore } from "@/lib/auth/auth-store";
import {
  parseTranscriptFile,
  processTranscriptData,
} from "@/lib/services/transcript-import-service";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";

import { ExportHelpDialog } from "./export-help-dialog";
import { FileUpload } from "./file-upload";
import { ProcessingVisualization } from "./processing-visualization";

interface TranscriptImportFormProps {
  onBack: () => void;
}

export function TranscriptImportForm({ onBack }: TranscriptImportFormProps) {
  const [showWhyImportDialog, setShowWhyImportDialog] = useState(false);
  const [showHowToExportDialog, setShowHowToExportDialog] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { academicInfo, programInfo, completeOnboarding, setTranscriptData } =
    useOnboardingStore();
  const { user } = useAuthStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState(-1);
  const { mutate: updateUserProfile, isPending: isUpdateUserPending } =
    useUpdateUserProfile(user!.id);

  const transcriptForm = useForm({
    resolver: zodResolver(transcriptSchema),
  });

  // Mock processing stages for transcript
  const processingStages = [
    "Extracting course data from transcript",
    "Analyzing course history",
    "Matching courses with requirements",
    "Building your academic profile",
    "Finalizing your degree audit",
  ];

  const handleSubmit = async (values: any) => {
    if (!academicInfo || !programInfo) {
      toast.error("Please complete all previous steps first");
      return;
    }

    try {
      setIsProcessing(true);
      const file = values.transcript[0];

      // Start visual processing feedback
      setProcessingStage(0);

      // Simulate progress for visual feedback
      let currentStage = 0;
      const progressInterval = setInterval(() => {
        if (currentStage < processingStages.length - 1) {
          currentStage++;
          setProcessingStage(currentStage);
        } else {
          clearInterval(progressInterval);
        }
      }, 800);

      // Actually process the file
      const parsedData = await parseTranscriptFile(
        file,
        academicInfo,
        programInfo
      );

      // Clear the interval and set final stage
      clearInterval(progressInterval);
      setProcessingStage(processingStages.length - 1);

      // Store in onboarding store instead of React Query
      setTranscriptData(parsedData);

      toast.success("Transcript imported successfully!");

      // Mark onboarding as complete and navigate
      updateUserProfile({ onboardingCompleted: true });

      // Navigate after a short delay
      setTimeout(() => {
        router.push("/dashboard");
        completeOnboarding();
      }, 1500);
    } catch (error) {
      console.error("Error processing transcript:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to process your transcript. Please try again."
      );
      setProcessingStage(-1);
      setIsProcessing(false);
    }
  };

  if (isProcessing) {
    return (
      <ProcessingVisualization
        processingStage={processingStage}
        stages={processingStages}
      />
    );
  }

  return (
    <Card className="w-full max-w-lg border-2 border-primary/10 shadow-lg">
      <CardHeader>
        <CardTitle className="text-center">Import Your Transcript</CardTitle>
        <CardDescription className="text-center">
          We'll automatically extract your courses and grades
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...transcriptForm}>
          <form
            onSubmit={transcriptForm.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <FormField
              control={transcriptForm.control}
              name="transcript"
              render={({ field }) => (
                <FileUpload
                  field={field}
                  showWhyImportDialog={showWhyImportDialog}
                  setShowWhyImportDialog={setShowWhyImportDialog}
                />
              )}
            />

            {/* How to export transcript help */}
            <ExportHelpDialog
              open={showHowToExportDialog}
              onOpenChange={setShowHowToExportDialog}
            />

            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={onBack}>
                <ChevronLeft className="mr-2 size-4" />
                Back
              </Button>
              <Button type="submit" className="body2-medium rounded-[50px]">
                Import Transcript
                <ChevronRight className="ml-2 size-4" />
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
