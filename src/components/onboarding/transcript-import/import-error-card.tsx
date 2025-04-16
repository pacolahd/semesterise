// src/components/onboarding/transcript-import/import-error-card.tsx
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ImportErrorCardProps {
  title: string;
  error: string;
  details?: string;
  onReset: () => void;
  onBack?: () => void;
}

/**
 * Error card displayed when transcript import fails
 */
export function ImportErrorCard({
  title,
  error,
  details,
  onReset,
  onBack,
}: ImportErrorCardProps) {
  return (
    <Card className="w-full max-w-lg border-2 border-destructive/20 shadow-lg">
      <CardHeader className="bg-destructive/5 border-b border-destructive/20">
        <div className="flex flex-col items-center gap-3">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <CardTitle className="text-center text-foreground">
            {title || "Import Failed"}
          </CardTitle>
          <CardDescription className="text-center text-destructive font-medium">
            {error}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        {details && (
          <div className="rounded-md bg-muted p-4 text-sm">
            <h4 className="font-semibold mb-2">What might be wrong:</h4>
            <p className="text-muted-foreground">{details}</p>
          </div>
        )}

        <div>
          <h4 className="font-semibold mb-3">Troubleshooting tips:</h4>
          <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
            <li>
              Chale! As already stated, make sure you're exporting the complete
              transcript from CAMU (not just grades)
            </li>
            <li>Try saving the transcript as HTML, MHTML or PDF format</li>
            <li>
              Ensure all semesters and courses are visible in the exported file
            </li>
            <li>
              Check that you can see your complete course history before
              exporting
            </li>
            <li>
              Try signing out of CAMU and signing back in before exporting
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
        <Button onClick={onReset} className="ml-auto">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </CardFooter>
    </Card>
  );
}
