"use client";

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
  const lastSequenceRef = useRef(0);

  useEffect(() => {
    if (!user?.id) {
      console.warn("No user ID found, skipping Pusher subscription");
      return;
    }

    const pusherClient = getPusherClient();
    const channelName = `private-user-${user.id}`;
    const channel = pusherClient.subscribe(channelName);

    channel.bind("petition-notification", (rawData: any) => {
      const result = petitionNotificationSchema.safeParse(rawData);
      if (!result.success) {
        console.error("Invalid notification data:", result.error.flatten());
        return;
      }

      const data: PetitionNotificationInput = result.data;

      if (data.sequence && data.sequence > lastSequenceRef.current) {
        lastSequenceRef.current = data.sequence;

        toast.info(data.message, {
          id: data.id, // Prevent duplicate toasts
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

    return () => {
      channel.unbind_all();
      pusherClient.unsubscribe(channelName);
      // Only disconnect if no other subscriptions are active
      if (pusherClient.connection.state === "connected") {
        pusherClient.disconnect();
      }
    };
  }, [user?.id, queryClient]);
}
