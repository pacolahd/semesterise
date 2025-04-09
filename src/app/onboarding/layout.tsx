import { ReactNode } from "react";

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
      <header className="flex w-full items-center justify-between border-b border-border p-4 md:px-8">
        <AshesiLogo
          lightClassName="h-auto w-[90px]"
          darkClassName="h-auto w-[75px]"
        />
        <ThemeSwitcher />
      </header>

      {/* Main content area */}
      <main className="flex flex-1 flex-col items-center justify-start px-4 py-8 md:py-12">
        <div className="w-full max-w-4xl">{children}</div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        <p className="body3-regular">
          Semesterise • Academic Management System
        </p>
        <p className="body3-regular mt-1">
          © {new Date().getFullYear()} Ashesi University
        </p>
      </footer>
    </div>
  );
}
