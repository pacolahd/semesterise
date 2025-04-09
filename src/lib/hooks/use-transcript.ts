// src/lib/hooks/use-transcript-data.ts
import { useQuery } from "@tanstack/react-query";

import { TranscriptData } from "@/lib/types/transcript";

export function useTranscriptData() {
  return useQuery<TranscriptData & { enhancedData?: any }>({
    queryKey: ["transcript-data"],
    // This query is populated on transcript upload, not fetched
    staleTime: Infinity,
    enabled: false,
    // Fallback to localStorage if data not in React Query cache
    initialData: () => {
      if (typeof window === "undefined") return undefined;

      const savedData = localStorage.getItem("transcript-data");
      if (savedData) {
        try {
          return JSON.parse(savedData);
        } catch (e) {
          console.error("Failed to parse saved transcript data", e);
        }
      }
      return undefined;
    },
  });
}
