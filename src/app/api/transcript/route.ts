// src/app/api/transcript/route.ts
import { NextRequest, NextResponse } from "next/server";

import { validateTranscriptContent } from "@/lib/services/transcript-validation-service";

// Configure Flask service URL (set in environment variables)
const FLASK_API_URL = process.env.FLASK_API_URL || "http://localhost:5000";

// Helper to get mime type from file extension
function getMimeTypeFromExtension(filename: string): string | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "html") return "text/html";
  if (ext === "mhtml") return "application/x-mimearchive";
  if (ext === "pdf") return "application/pdf";
  return null;
}

// Validate request function
function validateTranscriptFile(formData: FormData): {
  valid: boolean;
  error?: string;
} {
  const file = formData.get("file") as File;

  if (!file) {
    return { valid: false, error: "No file provided" };
  }

  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: "File size exceeds the 10MB limit" };
  }

  // Validate file type
  const validMimeTypes = [
    "text/html",
    "application/x-mimearchive",
    "application/pdf",
  ];
  const expectedType = getMimeTypeFromExtension(file.name);

  if (!validMimeTypes.includes(file.type) && !expectedType) {
    return {
      valid: false,
      error:
        "Invalid file type. Please upload an HTML, MHTML, or PDF file exported from CAMU",
    };
  }

  return { valid: true };
}

export async function POST(request: NextRequest) {
  try {
    // Extract the form data from the incoming request
    const formData = await request.formData();

    // Validate the file
    const validation = validateTranscriptFile(formData);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const file = formData.get("file") as File;
    console.log("Processing transcript file:", file.name, "type:", file.type);

    // Add additional metadata to the form data
    if (formData.has("academicInfo")) {
      console.log("Academic info included in request");
    }

    if (formData.has("programInfo")) {
      console.log("Program info included in request");
    }

    try {
      // Forward the request to the Flask service
      const response = await fetch(`${FLASK_API_URL}/api/parse-transcript`, {
        method: "POST",
        body: formData,
      });

      // Get the response data
      const data = await response.json();

      // Check if the response was successful
      if (!response.ok) {
        console.error("Flask service error:", data.error || "Unknown error");
        return NextResponse.json(
          {
            error: data.error || "Failed to parse transcript",
            details: data.details || {},
            code: data.code || "TRANSCRIPT_PARSE_ERROR",
            status: "error",
          },
          { status: response.status }
        );
      }

      // NEW: Validate the parsed data actually contains transcript information
      const contentValidation = validateTranscriptContent(data);
      if (!contentValidation.valid) {
        return NextResponse.json(
          {
            error: contentValidation.error || "Invalid transcript content",
            details:
              contentValidation.details ||
              "The file doesn't contain valid transcript data",
            code: "INVALID_TRANSCRIPT_FORMAT",
            status: "error",
          },
          { status: 400 }
        );
      }

      // Enhance the response with metadata
      const enhancedResponse = {
        ...data,
        parseTimestamp: new Date().toISOString(),
        status: "success",
        fileInfo: {
          name: file.name,
          type: file.type,
          size: file.size,
        },
      };

      // Return the parsed transcript data
      return NextResponse.json(enhancedResponse);
    } catch (error: any) {
      console.error("Error proxying to transcript service:", error);

      // Provide more detailed error message
      let errorMessage =
        "Failed to communicate with transcript parsing service";
      let errorCode = "CONNECTION_ERROR";
      let errorDetails: any = { timestamp: new Date().toISOString() };

      // Extract error details
      if (error instanceof Error) {
        errorMessage = error.message;
        // Add more specific error messages based on error types
        if (error.cause && (error.cause as any).code) {
          const causeCode = (error.cause as any).code;
          errorDetails.cause = error.cause;
          errorDetails.causeCode = causeCode;

          // Handle specific error codes
          if (causeCode === "ECONNREFUSED") {
            errorMessage =
              "Cannot connect to transcript parsing service. The service might be offline or misconfigured.";
            errorCode = "SERVICE_UNAVAILABLE";
          } else if (causeCode === "ENOTFOUND") {
            errorMessage =
              "Transcript parsing service host not found. Please check service configuration.";
            errorCode = "SERVICE_NOT_FOUND";
          } else if (causeCode === "ETIMEDOUT") {
            errorMessage =
              "Connection to transcript parsing service timed out. Please try again later.";
            errorCode = "SERVICE_TIMEOUT";
          }
        }
      }

      // Add environment info for debugging (don't expose sensitive URLs in production)
      if (process.env.NODE_ENV !== "production") {
        errorDetails.serviceUrl = FLASK_API_URL;
      }

      return NextResponse.json(
        {
          error: errorMessage,
          status: "error",
          code: errorCode,
          details: errorDetails,
        },
        { status: 503 } // Service Unavailable
      );
    }
  } catch (error) {
    console.error("Error processing request:", error);

    // Provide more detailed error message if possible
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to process transcript upload request";

    return NextResponse.json(
      {
        error: errorMessage,
        status: "error",
        code: (error as any).code || "REQUEST_PROCESSING_ERROR",
        details: { timestamp: new Date().toISOString() },
      },
      { status: 500 }
    );
  }
}

// Add a health check endpoint
export async function GET() {
  try {
    const response = await fetch(`${FLASK_API_URL}/healthcheck`);

    if (!response.ok) {
      return NextResponse.json(
        { status: "error", message: "Transcript service returned an error" },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Enhance the response with local server timestamp
    return NextResponse.json({
      ...data,
      localCheck: {
        timestamp: new Date().toISOString(),
        serviceUrl: FLASK_API_URL,
      },
    });
  } catch (error) {
    console.error("Health check error:", error);

    // More detailed error response
    let errorMessage = "Transcript service unavailable";
    let errorDetails: any = {};

    if (error instanceof Error) {
      errorMessage = `Transcript service unavailable: ${error.message}`;
      errorDetails.errorType = error.name;
      errorDetails.message = error.message;

      // Add more details for connection errors
      if (error.cause && (error.cause as any).code) {
        const causeCode = (error.cause as any).code;
        errorDetails.causeCode = causeCode;

        if (causeCode === "ECONNREFUSED") {
          errorMessage =
            "Transcript import service is not running or is currently undergoing maintenance";
        }
      }
    }

    return NextResponse.json(
      {
        status: "error",
        message: errorMessage,
        details: errorDetails,
      },
      { status: 503 }
    );
  }
}
