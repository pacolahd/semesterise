// app/staff/layout.tsx
"use client";

import { useRouter } from "next/navigation";
import React, { useEffect } from "react";

import { Loader2 } from "lucide-react";

import { Navbar } from "@/components/navigation/navbar";
import { StaffTabBar } from "@/components/navigation/staff-tab-bar";
import { RealtimeNotificationsProvider } from "@/components/providers/realtime-notifications-provider";
import Routes from "@/constants/routes";
import { userRoles } from "@/drizzle/schema/auth/enums";
import { useAuthStore } from "@/lib/auth/auth-store";
import { useRequireAuth } from "@/lib/auth/client-permission-hooks";

// app/staff/layout.tsx

// app/staff/layout.tsx

// app/staff/layout.tsx

// app/staff/layout.tsx

// app/staff/layout.tsx

// app/staff/layout.tsx

// app/staff/layout.tsx

// app/staff/layout.tsx

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isLoading, user } = useAuthStore();

  // Show loading state if authentication is still loading
  if (isLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
          <h2 className="text-xl font-semibold">Loading your dashboard...</h2>
          <p className="text-muted-foreground">Please wait</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Add the RealtimeNotificationsProvider to enable notifications app-wide */}
      <RealtimeNotificationsProvider />
      <Navbar />
      <StaffTabBar />
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
