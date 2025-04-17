import { ReactNode } from "react";

import { Navbar } from "@/components/navigation/navbar";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { AshesiLogo } from "@/components/ui/ashesi-logo";

export default function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-surface-50 dark:bg-background">
      {/* Header with logo and theme switcher */}
      <Navbar
        showUploadButton={false}
        showNotifications={false}
        showUserDropdown={false}
        showThemeSwitcher={true}
        showSidebarTrigger={false}
      />

      {/* Main content area */}
      <main className="mt-20 flex flex-1 flex-col items-center justify-start px-4 py-8 md:py-12">
        <div className="w-full max-w-4xl">{children}</div>
      </main>
    </div>
  );
}
