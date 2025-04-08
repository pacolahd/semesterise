"use client";

import React, { JSX } from "react";

import { LockIcon, ShieldAlert } from "lucide-react";

import {
  useHasAllPermissions,
  useHasAnyPermission,
  useHasPermission,
} from "@/lib/auth/authorization";
import { Permission } from "@/lib/types/common";

/**
 * Props for components that need permission checks
 */
export interface WithPermissionProps {
  requiredPermission?: Permission;
  requiredPermissions?: Permission[]; // Any of these permissions grants access
  requiredAllPermissions?: Permission[]; // All of these permissions required
  fallback?: React.ReactNode;
}

/**
 * Component that conditionally renders children based on user permissions
 */
export function PermissionGate({
  children,
  requiredPermission,
  requiredPermissions,
  requiredAllPermissions,
  fallback = null,
}: React.PropsWithChildren<WithPermissionProps>) {
  // Check specific permission if required
  const hasSpecificPermission = requiredPermission
    ? useHasPermission(requiredPermission)
    : true;

  // Check for any required permissions
  const hasAnyRequiredPermission = requiredPermissions?.length
    ? useHasAnyPermission(requiredPermissions)
    : true;

  // Check for all required permissions
  const hasAllRequiredPermissions = requiredAllPermissions?.length
    ? useHasAllPermissions(requiredAllPermissions)
    : true;

  // Combined permission check
  const hasPermission =
    hasSpecificPermission &&
    hasAnyRequiredPermission &&
    hasAllRequiredPermissions;

  if (!hasPermission) {
    return fallback;
  }

  return <>{children}</>;
}

/**
 * Default fallback component for protected elements
 */
export function DefaultUnauthorizedFallback() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center rounded-md border border-red-200 bg-red-50 p-4 text-center dark:border-red-900/30 dark:bg-red-950/20">
      <LockIcon className="mb-2 h-5 w-5 text-red-500" />
      <p className="text-sm text-red-700 dark:text-red-400">
        You don't have permission to view this content
      </p>
    </div>
  );
}

/**
 * HOC that wraps a component with permission checks
 */
export function withPermission<P extends JSX.IntrinsicAttributes>(
  Component: React.ComponentType<P>,
  permissionProps: WithPermissionProps
): React.ComponentType<P> {
  const WithPermissionCheck = (props: P) => {
    const fallback = permissionProps.fallback || (
      <DefaultUnauthorizedFallback />
    );

    return (
      <PermissionGate {...permissionProps} fallback={fallback}>
        <Component {...props} />
      </PermissionGate>
    );
  };

  WithPermissionCheck.displayName = `WithPermission(${
    Component.displayName || Component.name || "Component"
  })`;

  return WithPermissionCheck;
}

/**
 * A button that is only enabled when the user has the required permissions
 */
export function PermissionButton({
  children,
  requiredPermission,
  requiredPermissions,
  requiredAllPermissions,
  disabledTooltip = "You don't have permission to perform this action",
  ...buttonProps
}: React.ButtonHTMLAttributes<HTMLButtonElement> &
  WithPermissionProps & { disabledTooltip?: string }) {
  // Check specific permission if required
  const hasSpecificPermission = requiredPermission
    ? useHasPermission(requiredPermission)
    : true;

  // Check for any required permissions
  const hasAnyRequiredPermission = requiredPermissions?.length
    ? useHasAnyPermission(requiredPermissions)
    : true;

  // Check for all required permissions
  const hasAllRequiredPermissions = requiredAllPermissions?.length
    ? useHasAllPermissions(requiredAllPermissions)
    : true;

  // Combined permission check
  const hasPermission =
    hasSpecificPermission &&
    hasAnyRequiredPermission &&
    hasAllRequiredPermissions;

  return (
    <button
      {...buttonProps}
      disabled={!hasPermission || buttonProps.disabled}
      title={!hasPermission ? disabledTooltip : buttonProps.title}
      aria-disabled={!hasPermission || buttonProps.disabled}
    >
      {children}
    </button>
  );
}

/**
 * Component for displaying unauthorized messages
 */
export function UnauthorizedMessage({
  title = "Access Denied",
  message = "You don't have permission to access this resource.",
  icon = <ShieldAlert className="h-8 w-8 text-red-500" />,
  className = "",
}: {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex w-full flex-col items-center justify-center p-6 text-center ${className}`}
    >
      {icon}
      <h2 className="mt-4 text-xl font-semibold text-red-700 dark:text-red-400">
        {title}
      </h2>
      <p className="mt-2 max-w-md text-gray-700 dark:text-gray-300">
        {message}
      </p>
    </div>
  );
}
