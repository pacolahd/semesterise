// src/lib/pusher/pusher-client.ts
import Pusher from "pusher-js";

let pusherClient: Pusher;

// Ensure we only create one instance of Pusher
export function getPusherClient() {
  if (!pusherClient) {
    // Enable Pusher debug logs in dev mode
    if (process.env.NODE_ENV !== "production") {
      Pusher.logToConsole = true;
    }

    pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: "/api/pusher/auth",
      auth: {
        // headers: {
        //   "Content-Type": "application/json",
        // },
      },
    });
  }
  return pusherClient;
}
