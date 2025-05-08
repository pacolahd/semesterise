"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AcademicInfoForm } from "@/components/onboarding/academic-info-form";
import { ProgramInfoForm } from "@/components/onboarding/program-info-form";
import { StepIndicator } from "@/components/onboarding/step-indicator";
import { TranscriptImportForm } from "@/components/onboarding/transcript-import/transcript-import-form";
import { userRoles } from "@/drizzle/schema/auth/enums";
import { useAuthStore } from "@/lib/auth/auth-store";
import {
  AcademicInfo,
  ProgramInfo,
  useOnboardingStore,
} from "@/lib/onboarding/onboarding-store";

// Mock major data (would come from the database in a real implementation)
const MAJORS = [
  { code: "CS", name: "Computer Science" },
  { code: "MIS", name: "Management Information Systems" },
  { code: "BA", name: "Business Administration" },
  { code: "CE", name: "Computer Engineering" },
  { code: "EE", name: "Electrical and Electronic Engineering" },
  { code: "ME", name: "Mechanical Engineering" },
];

// Mock math track data (only two options as requested)
const MATH_TRACKS = [
  { name: "Calculus", description: "Standard calculus track" },
  { name: "Pre-Calculus", description: "Preparatory mathematics track" },
];

export default function StudentOnboarding() {
  const router = useRouter();

  // Get auth state
  const { user, isLoading } = useAuthStore();

  // Get access to the onboarding store
  const {
    currentStep,
    setCurrentStep,
    setAcademicInfo,
    setProgramInfo,
    completeOnboarding,
  } = useOnboardingStore();

  // Numeric step derived from the string-based step in the store
  const stepNumber = (() => {
    switch (currentStep) {
      case "welcome":
      case "academic-info":
        return 0;
      case "program-info":
        return 1;
      case "transcript-import":
        return 2;
      default:
        return 0;
    }
  })();

  // Check user role and initialize
  useEffect(() => {
    // If not a student, redirect back to onboarding
    if (user && user.role !== userRoles.student) {
      toast.error("This page is only for students.");
      router.push("/onboarding");
      return;
    }

    // Set initial step if not already set
    if (currentStep === "welcome") {
      setCurrentStep("academic-info");
    }
  }, [user, router, currentStep, setCurrentStep]);

  // Form submission handlers
  const handleAcademicInfoSubmit = (data: AcademicInfo) => {
    setAcademicInfo(data);
    setCurrentStep("program-info");
  };

  const handleProgramInfoSubmit = (data: ProgramInfo) => {
    setProgramInfo(data);
    setCurrentStep("transcript-import");
  };

  // const handleTranscriptSubmit = async (values: any) => {
  //   if (!academicInfo || !programInfo) {
  //     toast.error("Please complete all previous steps first");
  //     return;
  //   }
  //
  //   setIsTranscriptProcessing(true);
  //   setProcessingStage(0); // Start processing animation
  //
  //   try {
  //     const file = values.transcript[0];
  //
  //     // In a real implementation, this would use the parseTranscriptFile server action
  //     // For now, we'll simulate the processing with a timeout for each stage
  //
  //     // Read the file
  //     const fileData = await file.arrayBuffer();
  //
  //     // Process the file in stages for visual feedback
  //     const processSteps = async () => {
  //       for (let i = 0; i < PROCESSING_STAGES.length; i++) {
  //         await new Promise((resolve) => setTimeout(resolve, 800));
  //         setProcessingStage(i);
  //       }
  //
  //       // This would be where we call the server action
  //       // const result = await parseTranscriptFile(fileData, file.type, academicInfo, programInfo);
  //
  //       toast.success("Transcript imported successfully!");
  //
  //       // Navigate to dashboard or degree audit view after a short delay
  //       setTimeout(() => {
  //         router.push("/dashboard");
  //       }, 1500);
  //     };
  //
  //     processSteps();
  //   } catch (error) {
  //     console.error("Error processing transcript:", error);
  //     toast.error("Failed to process your transcript. Please try again.");
  //     setProcessingStage(-1);
  //     setIsTranscriptProcessing(false);
  //   }
  // };

  // Navigation handlers
  const handleBack = () => {
    if (currentStep === "program-info") {
      setCurrentStep("academic-info");
    } else if (currentStep === "transcript-import") {
      setCurrentStep("program-info");
    }
  };

  const handleBackToWelcome = () => {
    router.push("/onboarding");
  };

  if (isLoading) {
    return (
      <div className="flex h-[70vh] w-full items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 size-8 animate-spin text-primary" />
          <p className="body1-regular text-muted-foreground">
            Loading your profile...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-6 pb-12">
      <div className="mb-2 space-y-2 text-center">
        <h1 className="h2-bold text-foreground">Complete Your Profile</h1>
        <p className="body1-regular text-muted-foreground">
          We need a few details to set up your academic profile
        </p>
      </div>

      <StepIndicator currentStep={stepNumber} totalSteps={3} />

      {currentStep === "academic-info" && (
        <AcademicInfoForm
          // form={academicForm}
          onSubmit={handleAcademicInfoSubmit}
          onBack={handleBackToWelcome}
          // suggestedYearGroups={suggestedYearGroups}
        />
      )}

      {currentStep === "program-info" && (
        <ProgramInfoForm
          onSubmit={handleProgramInfoSubmit}
          onBack={handleBack}
          majors={MAJORS}
          mathTracks={MATH_TRACKS}
        />
      )}

      {currentStep === "transcript-import" && (
        <TranscriptImportForm onBack={handleBack} />
      )}
    </div>
  );
}
