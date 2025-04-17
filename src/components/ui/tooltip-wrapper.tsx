// src/components/ui/tooltip-wrapper.tsx
"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// src/components/ui/tooltip-wrapper.tsx

interface TooltipWrapperProps {
  tooltipText: string;
  children: React.ReactNode;
  tooltipSide?: "top" | "right" | "bottom" | "left";
  tooltipAlign?: "start" | "center" | "end";
  tooltipSideOffset?: number;
  showTooltip?: boolean;
  hideAboveScreenSize?: string;
  className?: string;
}

const TooltipWrapper = ({
  tooltipText,
  children,
  tooltipSide = "right",
  tooltipAlign = "center",
  tooltipSideOffset = 10,
  showTooltip = true,
  hideAboveScreenSize,
  className,
}: TooltipWrapperProps) => {
  return showTooltip ? (
    <TooltipProvider>
      <Tooltip delayDuration={10}>
        <TooltipTrigger asChild>
          <div className="inline-flex">{children}</div>
        </TooltipTrigger>
        <TooltipContent
          side={tooltipSide}
          align={tooltipAlign}
          sideOffset={tooltipSideOffset}
          className={cn(
            hideAboveScreenSize ? `${hideAboveScreenSize}:hidden` : "",
            className
          )}
        >
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : (
    <>{children}</>
  );
};

export default TooltipWrapper;
