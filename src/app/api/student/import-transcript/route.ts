// src/app/api/student/import-transcript/route.ts
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import { AppError } from "@/lib/errors/app-error-classes";
import { processSemesterMappings } from "@/lib/services/semester-mapping-service";
import {
  extractSemesterNumber,
  isSummerSemester,
} from "@/lib/services/semester-mapping-service";
import { transcriptImportService } from "@/lib/services/transcript-import-service";
import {
  TranscriptImportRequest,
  TranscriptImportResult,
} from "@/lib/types/transcript";

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized. You must be logged in." },
        { status: 401 }
      );
    }

    // Parse the request body
    const importRequest: TranscriptImportRequest = await request.json();

    // Add the authenticated user ID to the request
    importRequest.authId = session.user.id;

    // Validate request data
    if (
      !importRequest.transcriptData ||
      !importRequest.academicInfo ||
      !importRequest.programInfo
    ) {
      return NextResponse.json(
        { error: "Missing required data for transcript import" },
        { status: 400 }
      );
    }

    // Perform basic validation on transcript data
    if (
      !importRequest.transcriptData.studentInfo ||
      !importRequest.transcriptData.semesters
    ) {
      return NextResponse.json(
        { error: "Invalid transcript data format" },
        { status: 400 }
      );
    }

    // Make sure we have a student ID
    if (!importRequest.transcriptData.studentInfo.student_roll_no) {
      return NextResponse.json(
        { error: "Missing student ID in transcript data" },
        { status: 400 }
      );
    }

    // Process semester mappings
    const mappings = await processSemesterMappings(
      importRequest.transcriptData.semesters,
      importRequest.academicInfo
    );

    // Enhancing mappings with summer semester information
    const enhancedMappings = mappings.map((mapping) => ({
      ...mapping,
      isSummer: isSummerSemester(mapping.camuSemesterName),
    }));

    // Process transcript import with transaction
    const result = await transcriptImportService.importTranscript(
      importRequest,
      enhancedMappings
    );

    return NextResponse.json(result);
  } catch (error) {
    // Convert error to AppError for consistent formatting
    const appError =
      error instanceof AppError
        ? error
        : new AppError({
            message:
              error instanceof Error
                ? error.message
                : "Failed to import transcript",
            code: "TRANSCRIPT_IMPORT_ERROR",
            source: "server",
            originalError: error,
          });

    console.error("Transcript import error:", appError);

    // Return error response
    return NextResponse.json(
      {
        success: false,
        error: appError.message,
        details: appError.details,
        code: appError.code,
      },
      { status: (appError.status as number) || 500 }
    );
  }
}
