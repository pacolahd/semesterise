// components/ui/form-submit-button.tsx
"use client";

import { useEffect, useState } from "react";

import { Loader2 } from "lucide-react";
import { useFormContext } from "react-hook-form";

import { Button, ButtonProps } from "@/components/ui/button";

// components/ui/form-submit-button.tsx

interface FormSubmitButtonProps extends ButtonProps {
  pendingText?: string;
  defaultText: string;
  isSubmitting?: boolean; // Add this prop to allow direct control from react-query
}

export function FormSubmitButton({
  pendingText,
  defaultText,
  className,
  isSubmitting: externalIsSubmitting,
  ...props
}: FormSubmitButtonProps) {
  const formContext = useFormContext();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update local state based on either React Hook Form's isSubmitting state or external control
  useEffect(() => {
    if (externalIsSubmitting !== undefined) {
      // If an external isSubmitting value is provided, use that
      setIsSubmitting(externalIsSubmitting);
    } else if (formContext) {
      // Otherwise fall back to the form context if available
      setIsSubmitting(formContext.formState.isSubmitting);
    }
  }, [formContext?.formState?.isSubmitting, externalIsSubmitting, formContext]);

  return (
    <Button
      type="submit"
      className={className}
      disabled={isSubmitting || props.disabled}
      {...props}
    >
      {isSubmitting ? (
        <>
          <Loader2 className="mr-2 size-4 animate-spin" />
          {pendingText || "Processing..."}
        </>
      ) : (
        defaultText
      )}
    </Button>
  );
}
