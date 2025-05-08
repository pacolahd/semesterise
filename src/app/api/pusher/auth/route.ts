// src/app/api/pusher/auth/route.ts
import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth/auth-actions";
import { pusher } from "@/lib/pusher/pusher-server";

export async function POST(req: NextRequest) {
  try {
    // Verify user session
    const sessionResult = await getSession();
    if (!sessionResult.success || !sessionResult.data) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user } = sessionResult.data;

    // Parse request body
    const data = await req.json();
    const { socket_id, channel_name } = data;

    // Only allow users to subscribe to their own channel
    if (!channel_name.includes(`private-user-${user.id}`)) {
      return NextResponse.json(
        { error: "Unauthorized channel" },
        { status: 403 }
      );
    }

    // Generate auth signature
    const authResponse = pusher.authorizeChannel(socket_id, channel_name);

    return NextResponse.json(authResponse);
  } catch (error) {
    console.error("Pusher auth error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
