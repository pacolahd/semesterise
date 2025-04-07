// app/(auth)/layout.tsx
import Image from "next/image";

import { AuthGuard } from "@/components/auth/auth-guard";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { AshesiLogo } from "@/components/ui/ashesi-logo";

/**
 * Auth Layout
 *
 * This layout is used for authentication pages like sign-in, sign-up, etc.
 * It's wrapped with AuthGuard(requireGuest=true) to ensure these pages
 * are only accessible to non-authenticated users. If a logged-in user
 * tries to access these pages, they'll be redirected to the dashboard.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard requireGuest={true}>
      <div className="flex min-h-screen w-full flex-col md:flex-row">
        {/* Left side - Illustration area */}
        <div className="relative hidden bg-surface-50 dark:bg-[--background] md:flex md:w-1/2 md:flex-col md:p-8 lg:p-12">
          <div className="absolute left-0 top-0 ml-6 mt-2">
            <AshesiLogo
              lightClassName="h-auto w-[90px]"
              darkClassName="h-auto w-[75px]"
            />
          </div>

          <div className="mx-[15px] mt-[15%] flex min-h-max flex-1 flex-col items-center py-8">
            <div className="relative h-64 w-full max-w-md">
              <Image
                src="/images/colored-light-illustration.png"
                alt="Illustration"
                fill
                className="object-contain dark:invert-[90%]"
                priority
              />
            </div>

            <h2 className="h3-medium lg:h2-bold my-6 text-center !font-bold ">
              Student petition and degree auditing center
            </h2>
            <p className="body2-regular text-center ">
              Submit and track your petitions with ease. Get real-time updates
              on your requests and take action when needed.
            </p>
          </div>
        </div>

        {/* Right side - Form area */}
        <div className="flex w-full flex-col bg-surface-500 dark:bg-[--background] md:w-1/2">
          <div className="flex items-center justify-between max-md:px-6">
            {/* Logo visible only on mobile */}
            <AshesiLogo className="mt-3 md:hidden" />

            <div className="ml-auto md:pr-6 md:pt-5">
              <ThemeSwitcher />
            </div>
          </div>

          <div className="flex items-start justify-center p-6 md:p-8 md:pt-7 lg:p-12 lg:pt-10">
            <div className="w-full max-w-sm">{children}</div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
