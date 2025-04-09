// src/lib/services/transcript-service.ts
import { ApiError } from "@/lib/api/api-utils";
import { TranscriptData } from "@/lib/types/transcript";

/**
 * Send transcript file to parser service and return structured data
 */
export async function parseTranscriptFile(
  file: File,
  academicInfo?: any,
  programInfo?: any
): Promise<TranscriptData> {
  try {
    const formData = new FormData();
    formData.append("file", file);

    // Add additional context if available
    if (academicInfo) {
      formData.append("academicInfo", JSON.stringify(academicInfo));
    }

    if (programInfo) {
      formData.append("programInfo", JSON.stringify(programInfo));
    }

    // Use our Next.js API route instead of calling Flask directly
    const response = await fetch("/api/transcript", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.error || "Failed to parse transcript",
        response.status
      );
    }

    const transcriptData = await response.json();
    return transcriptData;
  } catch (error) {
    console.error("Transcript parsing error:", error);

    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      error instanceof Error ? error.message : "Failed to process transcript",
      500
    );
  }
}

/**
 * Process transcript data into application-specific format
 * This can transform the data to match your application's needs
 */
export function processTranscriptData(transcriptData: TranscriptData) {
  // Process courses to add semester information to each course
  const allCourses = transcriptData.semesters.flatMap((semester) =>
    semester.courses.map((course) => ({
      ...course,
      semester: semester.name,
    }))
  );

  // Calculate aggregated statistics
  const totalCredits = allCourses.reduce(
    (sum, course) => sum + course.credits,
    0
  );
  const completedCredits = allCourses
    .filter((course) => course.grade && course.grade !== "E")
    .reduce((sum, course) => sum + course.credits, 0);

  // Return enhanced data
  return {
    ...transcriptData,
    enhancedData: {
      allCourses,
      totalCredits,
      completedCredits,
      completionPercentage:
        totalCredits > 0 ? (completedCredits / totalCredits) * 100 : 0,
    },
  };
}

/**
 * Check if a transcript parser service is available
 */
export async function checkTranscriptServiceHealth(): Promise<boolean> {
  try {
    const response = await fetch("/api/transcript");
    return response.ok;
  } catch (error) {
    console.error("Transcript service health check failed:", error);
    return false;
  }
}
