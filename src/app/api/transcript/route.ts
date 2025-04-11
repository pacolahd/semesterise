// src/app/api/transcript/route.ts
import { NextRequest, NextResponse } from "next/server";

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
          status: "error",
        },
        { status: response.status }
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
  } catch (error) {
    console.error("Error proxying to transcript service:", error);

    // Provide more detailed error message if possible
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to communicate with transcript parsing service";

    return NextResponse.json(
      {
        error: errorMessage,
        status: "error",
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

    return NextResponse.json(
      {
        status: "error",
        message: "Transcript service unavailable",
        details: error instanceof Error ? error.message : undefined,
      },
      { status: 503 }
    );
  }
}
