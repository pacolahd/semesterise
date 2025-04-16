// src/lib/stores/onboarding-store.ts
import { z } from "zod";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { TranscriptData } from "@/lib/onboarding/transcript-import/transcript-import-types";

// Add this import

export type OnboardingStep =
  | "welcome"
  | "academic-info"
  | "program-info"
  | "transcript-import"
  | "complete";

// Engineering majors
const ENGINEERING_MAJORS = ["CE", "EE", "ME"] as const;

// Academic info schema
export const academicInfoSchema = z.object({
  currentYear: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.enum(["1", "2", "3", "4"], {
      required_error: "Please select your current year",
    })
  ),
  currentSemester: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.enum(["Fall", "Spring", "Summer"], {
      required_error: "Please select your current semester",
    })
  ),
  yearGroup: z
    .string()
    .regex(/^\d{4}$/, {
      message: "Please enter a valid year (e.g., 2025)",
    })
    .nonempty("Year group is required"),
});

// Program info schema
export const programInfoSchema = z
  .object({
    major: z.string().nonempty("Please select your major"),
    mathTrack: z.string().optional(), // will handle requirement later
  })
  .refine(
    (data) => {
      const isEngineering = ENGINEERING_MAJORS.includes(data.major as any);
      if (!isEngineering) {
        return !!data.mathTrack;
      }
      return true;
    },
    {
      message: "Please select your math track",
      path: ["mathTrack"],
    }
  );

// Update the type definitions at the top of the file
export type AcademicInfo = z.infer<typeof academicInfoSchema>;
export type ProgramInfo = z.infer<typeof programInfoSchema>;

interface OnboardingState {
  currentStep: OnboardingStep;
  academicInfo: AcademicInfo | null;
  programInfo: ProgramInfo | null;
  transcriptData: TranscriptData | null; // Add this field

  // Actions
  setCurrentStep: (step: OnboardingStep) => void;
  setAcademicInfo: (info: AcademicInfo) => void;
  setProgramInfo: (info: ProgramInfo) => void;
  setTranscriptData: (data: TranscriptData) => void; // Add this action
  completeOnboarding: () => void;
  resetStore: () => void; // Add a reset function
}

// Update validation schema to include transcript data
const onboardingSchema = z.object({
  currentStep: z.enum([
    "welcome",
    "academic-info",
    "program-info",
    "transcript-import",
    "complete",
  ]),
  academicInfo: z
    .object({
      currentYear: z.string(),
      currentSemester: z.string(),
      yearGroup: z.string(),
    })
    .nullable(),
  programInfo: z
    .object({
      major: z.string(),
      mathTrack: z.string().optional(),
    })
    .nullable(),
  transcriptData: z.any().nullable(), // We'll allow any for the transcript data
});

const STORAGE_KEY = "semesterise-onboarding-persistent";

// Default initial state
const initialState = {
  currentStep: "welcome" as OnboardingStep,
  academicInfo: null,
  programInfo: null,
  transcriptData: null,
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      ...initialState,

      setCurrentStep: (step) => set({ currentStep: step }),
      setAcademicInfo: (info) => set({ academicInfo: info }),
      setProgramInfo: (info) => set({ programInfo: info }),
      setTranscriptData: (data) => set({ transcriptData: data }), // Add this function
      resetStore: () => set(initialState), // Reset function

      completeOnboarding: () => {
        set({ currentStep: "complete" });
        // 2. Explicitly remove from localStorage to ensure it's cleared
        localStorage.removeItem(STORAGE_KEY);
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => {
        // When onboarding is complete, return null to prevent storing anything
        if (state.currentStep === "complete") {
          return null; // This prevents anything from being stored
        }

        // Otherwise store all relevant state
        return {
          currentStep: state.currentStep,
          academicInfo: state.academicInfo,
          programInfo: state.programInfo,
          transcriptData: state.transcriptData,
        } as Pick<
          OnboardingState,
          "currentStep" | "academicInfo" | "programInfo" | "transcriptData"
        >;
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Validate stored data
          const result = onboardingSchema.safeParse(state);
          if (!result.success) {
            console.error("Invalid onboarding state:", result.error);
            localStorage.removeItem(STORAGE_KEY);
            useOnboardingStore.setState(initialState);
          }
        }
      },
    }
  )
);
