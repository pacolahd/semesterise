// app/(dashboard)/layout.tsx
import { PropsWithChildren } from "react";

import { AuthGuard } from "@/components/auth/auth-guard";

/**
 * Dashboard Layout
 *
 * This layout is used for all authenticated dashboard pages.
 * It's wrapped with AuthGuard(requireAuth=true) to ensure these pages
 * are only accessible to authenticated users. If a non-authenticated user
 * tries to access these pages, they'll be redirected to the sign-in page.
 *
 * This is where you would put shared dashboard components like:
 * - Navigation sidebar
 * - Top header/navbar
 * - Footer
 * - Common notifications area
 */
export default function DashboardLayout({ children }: PropsWithChildren) {
  return (
    <AuthGuard requireAuth={true}>
      {/* Dashboard layout structure goes here */}
      <div className="flex min-h-screen">
        {/* Sidebar would go here */}

        <div className="flex-1">
          {/* Top navbar would go here */}

          {/* Main content */}
          <main className="p-4">{children}</main>

          {/* Footer would go here */}
        </div>
      </div>
    </AuthGuard>
  );
}
