import { NextRequest, NextResponse } from "next/server";

import Pusher from "pusher";

import { getSession } from "@/lib/auth/auth-actions";
import { pusher } from "@/lib/pusher/pusher-server";

export async function POST(req: NextRequest) {
  try {
    // Log request details
    console.log(
      "Pusher auth request headers:",
      Object.fromEntries(req.headers)
    );
    const rawBody = await req.text();
    console.log("Pusher auth raw body:", rawBody);

    // Verify user session
    const sessionResult = await getSession();
    if (!sessionResult.success || !sessionResult.data?.user) {
      console.error("Pusher auth: Session invalid or user not found");
      // Return 401 but with a specific error code for "not logged in"
      return NextResponse.json(
        { error: "Unauthorized", code: "NOT_AUTHENTICATED" },
        { status: 401 }
      );
    }

    const { user } = sessionResult.data;

    // Get Content-Type header
    const contentType = req.headers.get("content-type") || "";

    let socket_id: string | null, channel_name: string | null;

    if (contentType.includes("application/json")) {
      // Parse JSON body
      try {
        const data = JSON.parse(rawBody);
        socket_id = data.socket_id;
        channel_name = data.channel_name;
      } catch (error) {
        console.error("Pusher auth: Failed to parse JSON body:", error);
        return NextResponse.json(
          { error: "Invalid JSON body" },
          { status: 400 }
        );
      }
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      // Parse URL-encoded body
      const params = new URLSearchParams(rawBody);
      socket_id = params.get("socket_id");
      channel_name = params.get("channel_name");
    } else {
      console.error("Pusher auth: Unsupported Content-Type:", contentType);
      return NextResponse.json(
        { error: "Unsupported Content-Type" },
        { status: 415 }
      );
    }

    // Validate required parameters
    if (!socket_id || !channel_name) {
      console.error("Pusher auth: Missing socket_id or channel_name");
      return NextResponse.json(
        { error: "Missing socket_id or channel_name" },
        { status: 400 }
      );
    }

    // Ensure the channel belongs to the user
    if (!channel_name.startsWith(`private-user-${user.id}`)) {
      console.error(
        `Pusher auth: Unauthorized channel ${channel_name} for user ${user.id}`
      );
      return NextResponse.json(
        { error: "Unauthorized channel" },
        { status: 403 }
      );
    }

    // Authenticate the Pusher channel
    const authResponse = pusher.authorizeChannel(socket_id, channel_name);
    console.log("Pusher auth response:", authResponse);

    return NextResponse.json(authResponse);
  } catch (error) {
    console.error("Pusher auth error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
