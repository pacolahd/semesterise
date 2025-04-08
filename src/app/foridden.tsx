import Link from "next/link";
import { useRouter } from "next/navigation";

import { ShieldX } from "lucide-react";

import { AshesiLogo } from "@/components/ui/ashesi-logo";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth/auth-store";

export default function Forbidden() {
  const router = useRouter();
  const { user } = useAuthStore();

  const handleGoBack = () => {
    router.back();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8">
        <AshesiLogo className="mx-auto h-auto w-[120px]" />
      </div>

      <div className="w-full max-w-md rounded-lg border bg-card p-8 shadow-lg">
        <div className="mb-4 flex justify-center">
          <ShieldX size={48} className="text-destructive" />
        </div>

        <h1 className="mb-2 text-center text-2xl font-bold text-foreground">
          Access Restricted
        </h1>

        <div className="mb-6 mt-4 text-center text-muted-foreground">
          <p>You don't have permission to access this resource.</p>
          {user && (
            <div>
              <p className="mt-2">
                Your current role ({user.role}) doesn't have the required
                permissions.
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                If you believe this is an error, please contact the registry or
                support center for assistance.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Button onClick={handleGoBack} className="w-full">
            Go Back
          </Button>

          <Button asChild variant="outline" className="w-full">
            <Link href="/">Return Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
