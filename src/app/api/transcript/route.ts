import { NextRequest, NextResponse } from "next/server";

// Configure Flask service URL (set in environment variables)
const FLASK_API_URL = process.env.FLASK_API_URL || "http://localhost:5000";

export async function POST(request: NextRequest) {
  try {
    // Extract the form data from the incoming request
    const formData = await request.formData();

    // Forward the request to the Flask service
    const response = await fetch(`${FLASK_API_URL}/api/parse-transcript`, {
      method: "POST",
      body: formData,
    });

    // Get the response data
    const data = await response.json();

    // Check if the response was successful
    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || "Failed to parse transcript" },
        { status: response.status }
      );
    }

    // Return the parsed transcript data
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error proxying to transcript service:", error);

    return NextResponse.json(
      { error: "Failed to communicate with transcript parsing service" },
      { status: 500 }
    );
  }
}

// Add a health check endpoint
export async function GET() {
  try {
    const response = await fetch(`${FLASK_API_URL}/healthcheck`);
    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: "Transcript service unavailable" },
      { status: 503 }
    );
  }
}
