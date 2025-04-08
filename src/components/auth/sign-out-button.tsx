"use client";

import { useEffect, useRef } from "react";

import { Loader2, LogOut } from "lucide-react";

import { Button, ButtonProps } from "@/components/ui/button";
import { useSignOut } from "@/lib/auth/auth-hooks";

interface SignOutButtonProps extends Omit<ButtonProps, "onClick"> {
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  showIcon?: boolean;
  text?: string;
  onSignOutStart?: () => void;
  onSignOutComplete?: () => void;
  onSignOutError?: (error: unknown) => void;
}

export const SignOutButton = ({
  variant = "ghost",
  showIcon = true,
  text = "Sign out",
  className,
  onSignOutStart,
  onSignOutComplete,
  onSignOutError,
  ...props
}: SignOutButtonProps) => {
  const signOutMutation = useSignOut();
  const unmountedRef = useRef(false);

  // Track component unmounting to prevent state updates after unmount
  useEffect(() => {
    return () => {
      unmountedRef.current = true;
    };
  }, []);

  const handleSignOut = () => {
    // Call the onSignOutStart callback if provided
    if (onSignOutStart) {
      onSignOutStart();
    }

    signOutMutation.mutate(undefined, {
      onSuccess: () => {
        // Only trigger callback if component is still mounted
        if (!unmountedRef.current && onSignOutComplete) {
          onSignOutComplete();
        }
      },
      onError: (error) => {
        // Only trigger callback if component is still mounted
        if (!unmountedRef.current && onSignOutError) {
          onSignOutError(error);
        }
      },
    });
  };

  return (
    <Button
      variant={variant}
      onClick={handleSignOut}
      disabled={signOutMutation.isPending}
      className={className}
      {...props}
    >
      {signOutMutation.isPending ? (
        <Loader2 className="mr-2 size-4 animate-spin" />
      ) : (
        showIcon && <LogOut className="mr-2 size-4" />
      )}
      {signOutMutation.isPending ? "Signing out..." : text}
    </Button>
  );
};
