import { ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/utils";

interface CategoryHeaderProps {
  title: string;
  credits: string;
  percentage: number;
  isExpanded: boolean;
  onClick: () => void;
}

export function CategoryHeader({
  title,
  credits,
  percentage,
  isExpanded,
  onClick,
}: CategoryHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-4 cursor-pointer hover:bg-muted/20 transition-colors",
        isExpanded && "border-b"
      )}
      onClick={onClick}
    >
      <div className="flex-1 mr-2">
        <h3 className="font-medium overflow-hidden">{title}</h3>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">{credits}</span>
        {/*<span className="text-sm font-medium">{percentage}%</span>*/}
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
    </div>
  );
}
