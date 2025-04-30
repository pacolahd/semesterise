import { Progress } from "@/components/ui/progress";

interface CategoryProgressBarProps {
  completed: number;
  planned: number;
  percentage: number;
}

export function CategoryProgressBar({
  completed,
  planned,
  percentage,
}: CategoryProgressBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm mb-1">
        <div className="space-x-3">
          <span className="inline-flex items-center">
            <span className="h-3 w-3 rounded-full bg-green-500 mr-1"></span>
            {completed} completed
          </span>
          <span className="inline-flex items-center">
            <span className="h-3 w-3 rounded-full bg-gray-300 mr-1"></span>
            {planned} planned
          </span>
        </div>
        <span className="font-medium">{percentage}%</span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
}
