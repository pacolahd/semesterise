"use client";

import { useRealtimeNotifications } from "@/lib/petition-system/use-realtime-notifications";

export function RealtimeNotificationsProvider() {
  // Initialize the real-time notifications hook
  useRealtimeNotifications();

  // This component doesn't render anything visible
  return null;
}
