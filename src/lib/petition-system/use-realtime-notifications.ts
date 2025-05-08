import { useEffect, useRef } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

import { petitionNotificationSchema } from "@/drizzle/schema";
import { PetitionNotificationInput } from "@/drizzle/schema/petition-system/petition-notifications";
import { useAuthStore } from "@/lib/auth/auth-store";
import { getPusherClient } from "@/lib/pusher/pusher-client";

export function useRealtimeNotifications() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const lastSequenceRef = useRef(0); // Track last processed sequence

  useEffect(() => {
    if (!user?.id) return;

    const pusherClient = getPusherClient();
    const channelName = `private-user-${user.id}`;
    const channel = pusherClient.subscribe(channelName);

    channel.bind("petition-notification", (rawData: any) => {
      // Validate incoming message
      const result = petitionNotificationSchema.safeParse(rawData);
      if (!result.success) {
        console.error("Invalid notification data:", result.error);
        return;
      }

      const data: PetitionNotificationInput = result.data;

      // Ensure message order
      if (data.sequence! > lastSequenceRef.current) {
        lastSequenceRef.current = data.sequence || 0;

        // Process the notification
        toast.info(data.message, {
          action: {
            label: "View",
            onClick: () => {
              if (data.petitionId) {
                window.location.href = `/petitions/${data.petitionId}`;
              }
            },
          },
        });

        queryClient.invalidateQueries({ queryKey: ["userNotifications"] });
      }
    });

    // Cleanup on unmount
    return () => {
      channel.unbind_all();
      pusherClient.unsubscribe(channelName);
      pusherClient.disconnect(); // Ensure full cleanup
    };
  }, [user?.id, queryClient]);
}
