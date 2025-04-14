// src/components/onboarding/transcript-import/processing-visualization.tsx
import { AlertCircle, Check, Loader2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ProcessingVisualizationProps {
  phase: number;
  stage: number;
  phases: string[][];
  error?: string;
  statusMessage?: string;
}

/**
 * Visual indicator of transcript processing progress with multiple phases
 */
export function ProcessingVisualization({
  phase,
  stage,
  phases,
  error,
  statusMessage,
}: ProcessingVisualizationProps) {
  // Calculate overall progress percentage
  const totalSteps = phases.reduce((sum, p) => sum + p.length, 0);
  const completedSteps =
    phases.slice(0, phase).reduce((sum, p) => sum + p.length, 0) +
    (phase < phases.length ? stage : 0);

  const progressPercentage = Math.round((completedSteps / totalSteps) * 100);

  // Phase titles
  const phaseTitles = [
    "Analyzing Transcript Data",
    "Processing Academic Records",
  ];

  return (
    <Card className="w-full max-w-lg border-2 border-primary/10 shadow-lg">
      <CardHeader>
        <CardTitle className="text-center">
          {error
            ? "Import Error"
            : phaseTitles[Math.min(phase, phaseTitles.length - 1)]}
        </CardTitle>
        <CardDescription className="text-center">
          {error
            ? "There was an error processing your transcript"
            : statusMessage ||
              "Please wait while we process your academic data"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress bar */}
        <div className="space-y-2">
          <Progress value={progressPercentage} className="h-2" />
          <p className="text-right text-sm text-muted-foreground">
            {progressPercentage}% complete
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-medium">Import failed</p>
                <p>{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Phase 1 */}
        <div className="space-y-3">
          <h3
            className={cn(
              "font-medium",
              phase >= 1 ? "text-foreground" : "text-muted-foreground"
            )}
          >
            Phase 1: Data Extraction
          </h3>

          <div className="space-y-2 pl-2">
            {phases[0].map((stageMessage, idx) => (
              <div key={idx} className="flex items-center space-x-3">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full
                    ${
                      phase > 0 || (phase === 0 && idx < stage)
                        ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                        : phase === 0 && idx === stage
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                    }`}
                >
                  {phase > 0 || (phase === 0 && idx < stage) ? (
                    <Check size={14} />
                  ) : phase === 0 && idx === stage ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-muted-foreground/50"></div>
                  )}
                </div>
                <span
                  className={`text-sm ${
                    phase > 0 || (phase === 0 && idx < stage)
                      ? "text-foreground"
                      : phase === 0 && idx === stage
                        ? "font-medium text-foreground"
                        : "text-muted-foreground"
                  }`}
                >
                  {stageMessage}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Phase 2 */}
        <div className="space-y-3">
          <h3
            className={cn(
              "font-medium",
              phase >= 1 ? "text-foreground" : "text-muted-foreground"
            )}
          >
            Phase 2: Database Integration
          </h3>

          <div className="space-y-2 pl-2">
            {phases[1].map((stageMessage, idx) => (
              <div key={idx} className="flex items-center space-x-3">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full
                    ${
                      phase > 1 || (phase === 1 && idx < stage)
                        ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                        : phase === 1 && idx === stage
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                    }`}
                >
                  {phase > 1 || (phase === 1 && idx < stage) ? (
                    <Check size={14} />
                  ) : phase === 1 && idx === stage ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-muted-foreground/50"></div>
                  )}
                </div>
                <span
                  className={`text-sm ${
                    phase > 1 || (phase === 1 && idx < stage)
                      ? "text-foreground"
                      : phase === 1 && idx === stage
                        ? "font-medium text-foreground"
                        : "text-muted-foreground"
                  }`}
                >
                  {stageMessage}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
