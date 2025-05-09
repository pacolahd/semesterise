// src/app/api/pusher/auth/route.ts
import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth/auth-actions";
import { pusher } from "@/lib/pusher/pusher-server";

export async function POST(req: NextRequest) {
  try {
    const sessionResult = await getSession();
    if (!sessionResult.success || !sessionResult.data) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user } = sessionResult.data;

    // Parse the form-encoded body (default for Pusher)
    const body = await req.text();
    const params = new URLSearchParams(body);
    const socket_id = params.get("socket_id");
    const channel_name = params.get("channel_name");

    if (!socket_id || !channel_name) {
      return NextResponse.json(
        { error: "Missing socket_id or channel_name" },
        { status: 400 }
      );
    }

    // Optional: verify channel name belongs to user
    if (!channel_name.startsWith(`private-user-${user.id}`)) {
      return NextResponse.json(
        { error: "Unauthorized channel" },
        { status: 403 }
      );
    }

    const authResponse = pusher.authenticate(socket_id, channel_name);
    return NextResponse.json(authResponse);
  } catch (error) {
    console.error("Pusher auth error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
