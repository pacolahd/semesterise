import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default async function EmailVerifiedPage() {
  return (
    <div className="flex grow flex-col items-center justify-center p-4">
      <h1 className="h1-medium mb-4 font-bold text-green-500">
        Email Verified!
      </h1>
      <p className="mb-4 text-tcol-400">
        Your email has been successfully verified.
      </p>
      <Link
        href="/"
        className={buttonVariants({
          variant: "default",
        })}
      >
        Go to home
      </Link>
    </div>
  );
}
