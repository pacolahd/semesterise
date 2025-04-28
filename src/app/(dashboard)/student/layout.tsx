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
