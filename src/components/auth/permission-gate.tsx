"use client";

import React from "react";

import { Button, ButtonProps } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useHasAllPermissions,
  useHasAnyPermission,
  useHasPermission,
} from "@/lib/auth/client-permission-hooks";
import { Permission } from "@/lib/types/common";

interface PermissionGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  permission?: Permission;
  anyPermission?: Permission[];
  allPermissions?: Permission[];
}

/**
 * A component that conditionally renders its children based on user permissions
 */
export function PermissionGate({
  children,
  fallback,
  permission,
  anyPermission,
  allPermissions,
}: PermissionGateProps) {
  // Check permissions based on provided props
  let hasPermission = true;

  if (permission) {
    hasPermission = useHasPermission(permission);
  } else if (anyPermission) {
    hasPermission = useHasAnyPermission(anyPermission);
  } else if (allPermissions) {
    hasPermission = useHasAllPermissions(allPermissions);
  }

  // Default fallback when not provided
  const defaultFallback = (
    <div className="p-4 text-center text-gray-500">
      You don't have permission to view this content.
    </div>
  );

  // Render appropriate content
  if (hasPermission) {
    return <>{children}</>;
  }

  return <>{fallback || defaultFallback}</>;
}

interface PermissionButtonProps extends ButtonProps {
  permission?: Permission;
  anyPermission?: Permission[];
  allPermissions?: Permission[];
  disabledMessage?: string;
  showTooltip?: boolean;
}

/**
 * A button that is only enabled if the user has the required permissions
 * Extends shadcn Button component to maintain all styling and variants
 */
export function PermissionButton({
  permission,
  anyPermission,
  allPermissions,
  children,
  disabledMessage = "You don't have permission to perform this action",
  showTooltip = true,
  ...props
}: PermissionButtonProps) {
  // Check permissions
  let hasPermission = true;

  if (permission) {
    hasPermission = useHasPermission(permission);
  } else if (anyPermission) {
    hasPermission = useHasAnyPermission(anyPermission);
  } else if (allPermissions) {
    hasPermission = useHasAllPermissions(allPermissions);
  }

  const isDisabled = !hasPermission || props.disabled;

  // Base button with permission check
  const buttonElement = (
    <Button {...props} disabled={isDisabled} aria-disabled={isDisabled}>
      {children}
    </Button>
  );

  // Add tooltip if permission is missing and tooltip is enabled
  if (!hasPermission && showTooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{buttonElement}</TooltipTrigger>
          <TooltipContent>
            <p>{disabledMessage}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return buttonElement;
}
