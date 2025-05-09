// src/components/providers/providers.tsx
import React from "react";

import { QueryProvider } from "@/components/providers/query-provider";
import { RealtimeNotificationsProvider } from "@/components/providers/realtime-notifications-provider";
import { SessionProvider } from "@/components/providers/session-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <SessionProvider>
          {/* Add the RealtimeNotificationsProvider to enable notifications app-wide */}
          <RealtimeNotificationsProvider />
          {children}
          <Toaster position="top-right" richColors closeButton />
        </SessionProvider>
      </ThemeProvider>
    </QueryProvider>
  );
};
