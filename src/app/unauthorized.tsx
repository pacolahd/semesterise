import Link from "next/link";

import { AshesiLogo } from "@/components/ui/ashesi-logo";
import { Button } from "@/components/ui/button";

export default function Unauthorized() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8">
        <AshesiLogo className="mx-auto h-auto w-[120px]" />
      </div>

      <div className="w-full max-w-md rounded-lg border bg-card p-8 shadow-lg">
        <h1 className="mb-2 text-center text-2xl font-bold text-foreground">
          Authentication Required
        </h1>

        <div className="mb-6 mt-4 text-center text-muted-foreground">
          <p>You need to sign in to access this page.</p>
          <p className="mt-2">
            Please sign in with your Ashesi credentials to continue.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <Button asChild className="w-full">
            <Link href="/sign-in">Sign In</Link>
          </Button>

          <Button asChild variant="outline" className="w-full">
            <Link href="/">Return Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
