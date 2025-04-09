// src/lib/state/onboarding.ts
import { z } from "zod";
import { create } from "zustand";
import { persist } from "zustand/middleware";

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

  // Actions
  setCurrentStep: (step: OnboardingStep) => void;
  setAcademicInfo: (info: AcademicInfo) => void;
  setProgramInfo: (info: ProgramInfo) => void;
  completeOnboarding: () => void;
}

// Validation schema
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
});

const STORAGE_KEY = "semesterise-onboarding-persistent";

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      currentStep: "welcome",
      academicInfo: null,
      programInfo: null,

      setCurrentStep: (step) => set({ currentStep: step }),
      setAcademicInfo: (info) => set({ academicInfo: info }),
      setProgramInfo: (info) => set({ programInfo: info }),

      completeOnboarding: () => {
        set({ currentStep: "complete" });
        localStorage.removeItem(STORAGE_KEY);
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => {
        if (state.currentStep === "complete") return null;
        return {
          currentStep: state.currentStep,
          academicInfo: state.academicInfo,
          programInfo: state.programInfo,
        } as Pick<
          OnboardingState,
          "currentStep" | "academicInfo" | "programInfo"
        >;
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Validate stored data
          const result = onboardingSchema.safeParse(state);
          if (!result.success) {
            console.error("Invalid onboarding state:", result.error);
            localStorage.removeItem(STORAGE_KEY);
            useOnboardingStore.setState({
              currentStep: "welcome",
              academicInfo: null,
              programInfo: null,
            });
          }

          // Auto-clear if completed
          if (state.currentStep === "complete") {
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      },
    }
  )
);
