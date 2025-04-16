// src/components/onboarding/transcript-import/service-unavailable-card.tsx
import { ArrowLeft, RefreshCw, ServerCrash } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ServiceUnavailableCardProps {
  message: string;
  details?: string;
  onRetry: () => void;
  onBack?: () => void;
  isRetrying?: boolean;
}

/**
 * Card displayed when the transcript service is unavailable
 */
export function ServiceUnavailableCard({
  message,
  details,
  onRetry,
  onBack,
  isRetrying = false,
}: ServiceUnavailableCardProps) {
  return (
    <Card className="w-full max-w-lg border-2 border-amber-200 shadow-lg dark:border-amber-900">
      <CardHeader className="bg-amber-50/50 border-b border-amber-200 dark:bg-amber-900/20 dark:border-amber-900">
        <div className="flex flex-col items-center gap-3">
          <ServerCrash className="h-10 w-10 text-amber-500 dark:text-amber-400" />
          <CardTitle className="text-center text-foreground">
            Service Temporarily Unavailable
          </CardTitle>
          <CardDescription className="text-center text-amber-700 font-medium dark:text-amber-400">
            {message}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        {details && process.env.NODE_ENV !== "production" && (
          <div className="rounded-md bg-muted p-4 text-sm">
            <p className="text-muted-foreground">{details}</p>
          </div>
        )}

        <div>
          <h4 className="font-semibold mb-3">What you can do:</h4>
          <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
            <li>Try again in a few minutes</li>
            <li>Check your internet connection</li>
            <li>Contact support if the problem persists</li>
            <li>
              You can continue with your profile setup and import your
              transcript later
            </li>
          </ul>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between pt-2">
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        )}
        <Button onClick={onRetry} className="ml-auto" disabled={isRetrying}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isRetrying ? "animate-spin" : ""}`}
          />
          {isRetrying ? "Checking..." : "Try Again"}
        </Button>
      </CardFooter>
    </Card>
  );
}
