import { Check, Loader2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ProcessingVisualizationProps {
  processingStage: number;
  stages: string[];
}

/**
 * Visual indicator of transcript processing progress
 */
export function ProcessingVisualization({
  processingStage,
  stages,
}: ProcessingVisualizationProps) {
  return (
    <Card className="w-full max-w-lg border-2 border-primary/10 shadow-lg">
      <CardHeader>
        <CardTitle className="text-center">
          Processing Your Transcript
        </CardTitle>
        <CardDescription className="text-center">
          Please wait while we analyze your academic history
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-6">
          {stages.map((stage, index) => (
            <div key={index} className="flex items-center space-x-3">
              <div
                className={`flex size-6 items-center justify-center rounded-full
                ${
                  index < processingStage
                    ? "bg-green-100 text-green-600"
                    : index === processingStage
                      ? "bg-primary/10 text-primary"
                      : "bg-gray-100 text-gray-400"
                }`}
              >
                {index < processingStage ? (
                  <Check size={14} />
                ) : index === processingStage ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <div className="size-2 rounded-full bg-gray-400"></div>
                )}
              </div>
              <span
                className={`body2-regular ${
                  index < processingStage
                    ? "text-foreground"
                    : index === processingStage
                      ? "font-medium text-foreground"
                      : "text-muted-foreground"
                }`}
              >
                {stage}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
