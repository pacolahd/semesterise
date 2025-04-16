// src/components/onboarding/transcript-import/transcript-import-form.tsx
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { ProcessingVisualization } from "@/components/onboarding/transcript-import/processing-visualization";
import { transcriptSchema } from "@/components/onboarding/transcript-import/transcript-import-schema";
import { VerificationDialog } from "@/components/onboarding/transcript-import/verification-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { useUpdateUserProfile } from "@/lib/auth/auth-hooks";
import { useAuthStore } from "@/lib/auth/auth-store";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { SemesterMapping, StudentProfileData } from "@/lib/types/transcript";

import { ExportHelpDialog } from "./export-help-dialog";
import { FileUpload } from "./file-upload";
import { WhyImportDialog } from "./why-import-dialog";

interface TranscriptImportFormProps {
  onBack: () => void;
}

export function TranscriptImportForm({ onBack }: TranscriptImportFormProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { academicInfo, programInfo, completeOnboarding, setTranscriptData } =
    useOnboardingStore();

  // State for form and processing
  const [file, setFile] = useState<File | null>(null);
  const [showWhyImportDialog, setShowWhyImportDialog] = useState(false);
  const [showHowToExportDialog, setShowHowToExportDialog] = useState(false);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [currentStage, setCurrentStage] = useState(0);
  const [processingError, setProcessingError] = useState<string | undefined>(
    undefined
  );
  const [statusMessage, setStatusMessage] = useState<string | undefined>(
    undefined
  );

  // Verification state
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [mappings, setMappings] = useState<SemesterMapping[]>([]);
  const [studentProfile, setStudentProfile] =
    useState<StudentProfileData | null>(null);
  const [verificationToken, setVerificationToken] = useState<
    string | undefined
  >(undefined);

  // Processing phases
  const phases = [
    [
      "Analyzing transcript data",
      "Extracting completed courses",
      "Identifying degree and major",
      "Detecting math track",
      "Verifying academic timeline",
    ],
    [
      "Mapping to degree requirements",
      "Verifying grade requirements",
      "Calculating remaining credits",
      "Setting up personalized dashboard",
      "Finalizing your academic plan",
    ],
  ];

  // Form setup
  const transcriptForm = useForm({
    resolver: zodResolver(transcriptSchema),
  });

  // User profile update mutation
  const { mutate: updateUserProfile, isPending: isUpdateUserPending } =
    useUpdateUserProfile(user!.id);

  // Handles file selection
  const handleFileChange = (selectedFile: File) => {
    setFile(selectedFile);
    console.log("File selected:", selectedFile.name);
  };

  // Main form submission
  // Updated handleSubmit function for transcript-import-form.tsx - with better error handling

  const handleSubmit = async (values: any) => {
    if (!academicInfo || !programInfo) {
      toast.error("Please complete all previous steps first");
      return;
    }

    // Better validation for transcript file
    if (!values.transcript) {
      toast.error("Please select a transcript file");
      return;
    }

    let fileToProcess: File;

    // Handle different ways the file might be provided
    if (values.transcript instanceof FileList) {
      if (values.transcript.length === 0) {
        toast.error("Please select a transcript file");
        return;
      }
      fileToProcess = values.transcript[0];
    } else if (values.transcript instanceof File) {
      fileToProcess = values.transcript;
    } else {
      toast.error(
        "Invalid file format. Please select a valid transcript file."
      );
      return;
    }

    setFile(fileToProcess);

    try {
      // Start processing
      setIsProcessing(true);
      setCurrentPhase(0);
      setCurrentStage(0);
      setProcessingError(undefined);

      // Create form data for file upload
      const formData = new FormData();
      formData.append("file", fileToProcess);

      // Add context information
      formData.append("academicInfo", JSON.stringify(academicInfo));
      formData.append("programInfo", JSON.stringify(programInfo));

      // Phase 1: Send to Flask parser service
      setStatusMessage("Sending transcript to parser service...");

      updateProgress(0, 0, "Analyzing transcript data");

      // Extract data using Flask parser API
      const parseResponse = await fetch("/api/transcript", {
        method: "POST",
        body: formData,
      });

      // Get the response data - even if it's an error
      const responseData = await parseResponse.json();

      if (!parseResponse.ok) {
        // Extract detailed error information from the API response
        const errorMessage = responseData.error || "Failed to parse transcript";
        const errorCode = responseData.code || "UNKNOWN_ERROR";
        const errorDetails = responseData.details || {};

        // Construct a detailed error message based on the error code
        let userFriendlyMessage = errorMessage;

        if (errorCode === "SERVICE_UNAVAILABLE") {
          userFriendlyMessage =
            "The transcript parsing service is not available. Please try again later or contact support.";
        } else if (errorCode === "SERVICE_NOT_FOUND") {
          userFriendlyMessage =
            "Cannot connect to the transcript parsing service. Please try again later or contact support.";
        } else if (errorCode === "SERVICE_TIMEOUT") {
          userFriendlyMessage =
            "The connection to the transcript parsing service timed out. Please try again later.";
        }

        // Log detailed error for debugging
        console.error("Transcript parsing error:", {
          code: errorCode,
          message: errorMessage,
          details: errorDetails,
        });

        throw new Error(userFriendlyMessage);
      }

      // Successfully parsed transcript data
      const parsedData = responseData;
      updateProgress(0, 1, "Extracted courses from transcript");

      // Check required data
      if (!parsedData.studentInfo || !parsedData.semesters) {
        throw new Error(
          "Invalid data returned from parser service. The transcript could not be properly parsed."
        );
      }

      // Continue Phase 1 progress
      updateProgress(
        0,
        2,
        `Identified "${parsedData.studentInfo.degree}" major`
      );

      // Simulate math track detection
      await new Promise((resolve) => setTimeout(resolve, 800));
      updateProgress(0, 3, `Detected math track`);

      // Analyze timeline
      await new Promise((resolve) => setTimeout(resolve, 800));
      updateProgress(0, 4, `Analyzing academic timeline`);

      // Phase 2: Process data with our API
      setCurrentPhase(1);
      setCurrentStage(0);
      setStatusMessage("Processing with database...");

      // Import to database
      const importResponse = await fetch("/api/student/import-transcript", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcriptData: parsedData,
          academicInfo,
          programInfo,
        }),
      });

      // Get the import response data - even if it's an error
      const importResponseData = await importResponse.json();

      if (!importResponse.ok) {
        // Extract detailed error information from the API response
        const errorMessage =
          importResponseData.error || "Failed to import transcript";
        const errorCode = importResponseData.code || "UNKNOWN_ERROR";
        const errorDetails = importResponseData.details || {};

        // Log detailed error for debugging
        console.error("Transcript import error:", {
          code: errorCode,
          message: errorMessage,
          details: errorDetails,
        });

        throw new Error(`Import failed: ${errorMessage}`);
      }

      const importResult = importResponseData;

      // Process remaining steps
      updateProgress(1, 1, "Mapping courses to requirements");
      await new Promise((resolve) => setTimeout(resolve, 600));

      updateProgress(1, 2, "Calculating remaining credits");
      await new Promise((resolve) => setTimeout(resolve, 600));

      updateProgress(1, 3, "Setting up your dashboard");
      await new Promise((resolve) => setTimeout(resolve, 600));

      updateProgress(1, 4, "Import complete");

      // Store transcript data
      setTranscriptData(parsedData);

      // Check if verification is needed
      if (importResult.requiresVerification) {
        setMappings(importResult.mappings);
        setStudentProfile(importResult.studentProfile);
        setVerificationToken(importResult.verificationToken);

        // Show verification dialog
        setShowVerificationDialog(true);
        setIsProcessing(false);
      } else {
        // Complete onboarding
        completeOnboarding();
        updateUserProfile({ onboardingCompleted: true });

        // Show success message
        toast.success("Transcript imported successfully!");

        // Navigate to dashboard
        setTimeout(() => {
          router.push("/dashboard");
        }, 1500);
      }
    } catch (error) {
      console.error("Error processing transcript:", error);

      // Extract the most user-friendly error message
      let errorMessage = "Failed to process your transcript. Please try again.";

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      // Update UI state
      setProcessingError(errorMessage);

      // Show error toast with more details
      toast.error(errorMessage, {
        description:
          "Check if the transcript parser service is running or contact support.",
        duration: 6000, // Show longer for error messages
        action: {
          label: "Try Again",
          onClick: () => {
            setIsProcessing(false);
            setProcessingError(undefined);
          },
        },
      });

      // Reset processing state after a delay
      setTimeout(() => {
        setIsProcessing(false);
      }, 3000);
    }
  };

  // Helper for updating progress
  const updateProgress = (phase: number, stage: number, message?: string) => {
    setCurrentPhase(phase);
    setCurrentStage(stage);
    if (message) {
      setStatusMessage(message);
    }
  };

  // Handle verification confirmation
  const handleVerificationConfirm = async (
    updatedMappings: SemesterMapping[]
  ) => {
    try {
      setIsProcessing(true);
      setStatusMessage("Updating semester mappings...");

      // Send verification update
      const response = await fetch("/api/student/verify-mappings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mappings: updatedMappings,
          studentId: studentProfile?.studentId,
          token: verificationToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to verify mappings");
      }

      // Complete onboarding
      completeOnboarding();
      updateUserProfile({ onboardingCompleted: true });

      // Show success message
      toast.success("Transcript import completed successfully!");

      // Close dialog and navigate to dashboard
      setShowVerificationDialog(false);
      setTimeout(() => {
        router.push("/dashboard");
      }, 500);
    } catch (error) {
      console.error("Verification error:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to verify mappings. Please try again."
      );

      setIsProcessing(false);
    }
  };

  // Render processing state
  if (isProcessing) {
    return (
      <ProcessingVisualization
        phase={currentPhase}
        stage={currentStage}
        phases={phases}
        error={processingError}
        statusMessage={statusMessage}
      />
    );
  }

  return (
    <>
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
              <FileUpload
                field={transcriptForm.register("transcript")}
                onFileChange={handleFileChange}
                showWhyImportDialog={() => setShowWhyImportDialog(true)}
                showHowToExportDialog={() => setShowHowToExportDialog(true)}
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
                <Button
                  type="submit"
                  className="body2-medium rounded-[50px]"
                  disabled={!file}
                >
                  Import Transcript
                  <ChevronRight className="ml-2 size-4" />
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Verification Dialog */}
      {showVerificationDialog && studentProfile && (
        <VerificationDialog
          isOpen={showVerificationDialog}
          onClose={() => setShowVerificationDialog(false)}
          mappings={mappings}
          studentProfile={studentProfile}
          verificationToken={verificationToken}
          onConfirm={handleVerificationConfirm}
          onUpdate={(updatedMappings) => setMappings(updatedMappings)}
        />
      )}
    </>
  );
}
