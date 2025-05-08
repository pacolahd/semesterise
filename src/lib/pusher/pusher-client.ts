// src/lib/pusher/pusher-client.ts
import PusherClient from "pusher-js";

let pusherClient: PusherClient;

// Ensure we only create one instance of Pusher
export function getPusherClient() {
  if (!pusherClient) {
    pusherClient = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: "/api/pusher/auth",
    });
  }
  return pusherClient;
}
