"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { Loader2 } from "lucide-react";

import { Navbar } from "@/components/navigation/navbar";
import { StudentSidebar } from "@/components/navigation/student-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import Routes from "@/constants/routes";
import ROUTES from "@/constants/routes";
import { userRoles } from "@/drizzle/schema/auth/enums";
import { useAuthStore } from "@/lib/auth/auth-store";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // const router = useRouter();
  // const { isLoading, user } = useAuthStore();
  //
  // // Show loading state if authentication is still loading
  // if (isLoading || !user) {
  //   return (
  //     <div className="flex h-screen w-full items-center justify-center">
  //       <div className="text-center">
  //         <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
  //         <h2 className="text-xl font-semibold">Loading your dashboard...</h2>
  //         <p className="text-muted-foreground">Please wait</p>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen flex-col relative">
        <Navbar />
        <div className="flex">
          <StudentSidebar />
          <section className="flex min-h-screen flex-1 flex-col px-6 pb-6 pt-20 max-md:pb-14 sm:px-6">
            <div className="mx-auto w-full max-w-max">{children}</div>
          </section>
        </div>
      </div>
    </SidebarProvider>
  );
}
