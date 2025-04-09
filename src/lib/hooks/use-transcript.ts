// src/lib/hooks/use-transcript-data.ts
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { TranscriptData } from "@/lib/types/transcript";

export function useTranscriptData(): TranscriptData | null {
  const { transcriptData } = useOnboardingStore();
  return transcriptData;
}
