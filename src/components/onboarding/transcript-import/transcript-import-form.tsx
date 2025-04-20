// src/components/onboarding/transcript-import/transcript-import-form.tsx
// Updated to include service health check before upload
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { ImportErrorCard } from "@/components/onboarding/transcript-import/import-error-card";
import { ServiceUnavailableCard } from "@/components/onboarding/transcript-import/import-service-unavailable-card";
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
import {
  useUpdateUserProfile,
  useUpdateUserProfileSilent,
} from "@/lib/auth/auth-hooks";
import { useAuthStore } from "@/lib/auth/auth-store";
import { useOnboardingStore } from "@/lib/onboarding/onboarding-store";
import { checkWithRetry } from "@/lib/onboarding/transcript-import/services/service-health-checks";
import { validateTranscriptContent } from "@/lib/onboarding/transcript-import/services/transcript-validation-service";
import {
  SemesterMapping,
  StudentProfileData,
} from "@/lib/onboarding/transcript-import/transcript-import-types";

import { ExportHelpDialog } from "./export-help-dialog";
import { FileUpload } from "./file-upload";
import { WhyImportDialog } from "./why-import-dialog";

interface TranscriptImportFormProps {
  onBack: () => void;
}

export function TranscriptImportForm({ onBack }: TranscriptImportFormProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    academicInfo,
    programInfo,
    currentStep,
    setCurrentStep,
    completeOnboarding,
    setTranscriptData,
  } = useOnboardingStore();

  // State for form and processing
  const [file, setFile] = useState<File | null>(null);
  const [showWhyImportDialog, setShowWhyImportDialog] = useState(false);
  const [showHowToExportDialog, setShowHowToExportDialog] = useState(false);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGoingToDashboard, setIsGoingToDashboard] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [currentStage, setCurrentStage] = useState(0);
  const [processingError, setProcessingError] = useState<string | undefined>(
    undefined
  );
  const [errorDetails, setErrorDetails] = useState<string | undefined>(
    undefined
  );
  const [statusMessage, setStatusMessage] = useState<string | undefined>(
    undefined
  );

  // Service health state
  const [serviceAvailable, setServiceAvailable] = useState<boolean | null>(
    null
  );
  const [serviceMessage, setServiceMessage] = useState<string>("");
  const [serviceDetails, setServiceDetails] = useState<string>("");
  const [isCheckingService, setIsCheckingService] = useState(false);

  // Verification state
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [mappings, setMappings] = useState<SemesterMapping[]>([]);
  const [studentProfile, setStudentProfile] =
    useState<StudentProfileData | null>(null);
  const [verificationToken, setVerificationToken] = useState<
    string | undefined
  >(undefined);

  // TODO: Improv loading simulation when we hit mapping to degree requirements (50%). Include a continuous loading tht goes gradually till verifying grade requirements?
  // Processing phases
  const phases = [
    [
      "Analyzing transcript data",
      "Extracting completed courses",
      "Identifying degree and major",
      "Detecting math track",
      "Detecting capstone option",
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
    useUpdateUserProfileSilent(user!.id);

  // Check service health on component mount
  useEffect(() => {
    checkServiceHealth();
  }, []);

  // Function to check service health
  const checkServiceHealth = async () => {
    setIsCheckingService(true);
    try {
      const healthResult = await checkWithRetry(2, 1000);

      setServiceAvailable(healthResult.available);
      setServiceMessage(healthResult.message);

      // Format service details
      if (healthResult.details) {
        if (typeof healthResult.details === "object") {
          setServiceDetails(
            `Service attempted to connect ${healthResult.attempts} times. ${JSON.stringify(healthResult.details, null, 2)}`
          );
        } else {
          setServiceDetails(String(healthResult.details));
        }
      }

      if (!healthResult.available) {
        console.warn("Transcript service is unavailable:", healthResult);
      }
    } catch (error) {
      console.error("Error checking service health:", error);
      setServiceAvailable(false);
      setServiceMessage("Failed to check service status");
      setServiceDetails(error instanceof Error ? error.message : String(error));
    } finally {
      setIsCheckingService(false);
    }
  };

  // Handles file selection
  const handleFileChange = (selectedFile: File) => {
    setFile(selectedFile);
    console.log("File selected:", selectedFile.name);
  };

  // Main form submission
  const handleSubmit = async (values: any) => {
    // First check if service is available
    if (serviceAvailable === false) {
      // Check again just to be sure
      await checkServiceHealth();

      // If still unavailable, don't proceed
      if (serviceAvailable === false) {
        toast.error(
          "Transcript service is unavailable. Please try again later."
        );
        return;
      }
    }

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
      setErrorDetails(undefined);

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
        let errorDetailMessage = "";

        if (errorCode === "SERVICE_UNAVAILABLE") {
          userFriendlyMessage =
            "The transcript parsing service is not available";
          errorDetailMessage =
            "The server that extracts information from your transcript file is temporarily unavailable. Please try again later or contact support.";

          // Update service status
          setServiceAvailable(false);
        } else if (errorCode === "SERVICE_NOT_FOUND") {
          userFriendlyMessage =
            "Cannot connect to the transcript parsing service";
          errorDetailMessage =
            "The server that extracts information from your transcript file cannot be reached. Please try again later or contact support.";

          // Update service status
          setServiceAvailable(false);
        } else if (errorCode === "SERVICE_TIMEOUT") {
          userFriendlyMessage =
            "The connection to the transcript parsing service timed out";
          errorDetailMessage =
            "The server took too long to respond. This might be due to high traffic or a network issue. Please try again later.";
        } else if (errorCode === "INVALID_TRANSCRIPT_FORMAT") {
          userFriendlyMessage = "Invalid transcript format";
          errorDetailMessage =
            "The file you uploaded doesn't appear to be a valid CAMU transcript. Make sure you're exporting the complete academic transcript from CAMU.";
        }

        // Log detailed error for debugging
        console.error("Transcript parsing error:", {
          code: errorCode,
          message: errorMessage,
          details: errorDetails,
        });

        // Set error state for display
        setProcessingError(userFriendlyMessage);
        setErrorDetails(
          errorDetailMessage ||
            "The transcript could not be processed. Please check the file and try again."
        );
        setIsProcessing(false);

        return; // Stop processing
      }

      // Successfully parsed transcript data
      const parsedData = responseData;

      // Validate that the parsed data actually contains transcript information
      const validationResult = validateTranscriptContent(parsedData);
      if (!validationResult.valid) {
        setProcessingError(validationResult.error || "Invalid transcript data");
        setErrorDetails(
          validationResult.details ||
            "The file you uploaded doesn't appear to contain valid transcript data."
        );
        setIsProcessing(false);
        return;
      }

      updateProgress(0, 1, "Extracted courses from transcript");

      // Check required data
      if (!parsedData.studentInfo || !parsedData.semesters) {
        throw new Error("Invalid data returned from parser service");
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
        updateUserProfile(
          { onboardingCompleted: true },
          {
            onSuccess: () => {
              // set onboarding step to teaching because we're going to the degree auditing view for the first time, and we want to show some guidelines to the user since it's their first time
              // setCurrentStep("teaching");
              // setIsProcessing(false);
              // setIsGoingToDashboard(true);
              toast.success("Transcript imported successfully!");
              setTimeout(() => {
                router.push("/");
              }, 3000);
            },
          }
        );
        // // Show success message
        // toast.success("Transcript imported successfully!");
        //
        // // Navigate to dashboard
        // setTimeout(() => {
        //   router.push("/dashboard");
        // }, 1500);
      }
    } catch (error) {
      console.error("Error processing transcript:", error);

      // Extract the most user-friendly error message
      let errorMessage = "Failed to process your transcript";
      let errorDetailMessage =
        "An unexpected error occurred while processing your transcript. Please try uploading a different file or try again later.";

      if (error instanceof Error) {
        errorMessage = error.message;

        // Check for specific error types
        if (error.message.includes("parse")) {
          errorDetailMessage =
            "The file couldn't be parsed correctly. Make sure you're uploading a proper HTML or MHTML transcript export from CAMU.";
        } else if (
          error.message.includes("network") ||
          error.message.includes("fetch")
        ) {
          errorDetailMessage =
            "There was a network issue while processing your transcript. Check your internet connection and try again.";

          // Also check service health again
          checkServiceHealth();
        }
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      // Update UI state
      setProcessingError(errorMessage);
      setErrorDetails(errorDetailMessage);

      // Reset processing state
      setIsProcessing(false);
      // setIsGoingToDashboard(false);
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
      // TODO: Improve transition to year view from the transcript import form. Make sure onboardingCompleted is set to true in the database before we attempt to navigate to the year view.

      // TODO: Use onboarding completed from the store to determine whether to show the user the help/welcome dialog upon reaching the year view. hence only update the onboarding completed in the auth store ONLY if the user has completed the help/welcome in the year view

      // Complete onboarding
      // completeOnboarding();
      // setIsProcessing(false);
      // setIsGoingToDashboard(true);
      updateUserProfile(
        { onboardingCompleted: true },
        {
          onSuccess: () => {
            // set onboarding step to teaching because we're going to the degree auditing view for the first time, and we want to show some guidelines to the user since it's their first time
            // setCurrentStep("teaching");
            toast.success("Transcript imported successfully!");
            setTimeout(() => {
              router.push("/");
            }, 3000);
          },
        }
      );
      // updateUserProfile({ onboardingCompleted: true });
      //
      // // Show success message
      // toast.success("Transcript import completed successfully!");
      //
      // // Close dialog and navigate to dashboard
      // setShowVerificationDialog(false);
      // setTimeout(() => {
      //   router.push("/dashboard");
      // }, 50);
    } catch (error) {
      console.error("Verification error:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to verify mappings. Please try again."
      );

      setIsProcessing(false);
      // setIsGoingToDashboard(false);
    }
  };

  // Render based on service availability
  if (serviceAvailable === false) {
    return (
      <ServiceUnavailableCard
        message={serviceMessage}
        details={serviceDetails}
        onRetry={checkServiceHealth}
        onBack={onBack}
        isRetrying={isCheckingService}
      />
    );
  }

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

  // Show error card if there's an error
  if (processingError) {
    return (
      <ImportErrorCard
        title="Transcript Import Failed"
        error={processingError}
        details={errorDetails}
        onReset={() => {
          setProcessingError(undefined);
          setErrorDetails(undefined);
          setFile(null);
          transcriptForm.reset();
        }}
        onBack={onBack}
      />
    );
  }

  if (isGoingToDashboard) {
    return (
      <div className="flex h-[30vh] w-full items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 size-8 animate-spin text-primary" />
          <p className="body1-regular text-muted-foreground">
            Finalizing and Redirecting to your dashboard...
          </p>
        </div>
      </div>
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
                  disabled={
                    !file || isCheckingService || serviceAvailable !== true
                  }
                >
                  {isCheckingService ? (
                    <>
                      <span className="mr-2 size-4 animate-spin">⟳</span>
                      Checking service...
                    </>
                  ) : (
                    <>
                      Import Transcript
                      <ChevronRight className="ml-2 size-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Why Import Dialog */}
      <WhyImportDialog
        open={showWhyImportDialog}
        onOpenChange={setShowWhyImportDialog}
      />

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
