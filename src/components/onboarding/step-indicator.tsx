export interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

/**
 * A visual indicator showing progress through a multi-step form
 */
export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="mb-8 flex justify-center space-x-2">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div
          key={index}
          className={`h-2 w-12 rounded-full ${
            index < currentStep
              ? "bg-primary"
              : index === currentStep
                ? "bg-primary/60"
                : "bg-gray-200 dark:bg-gray-700"
          }`}
        />
      ))}
    </div>
  );
}
