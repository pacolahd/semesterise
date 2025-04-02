// components/ui/form-submit-button.tsx
"use client";

import { useEffect, useState } from "react";

import { Loader2 } from "lucide-react";
import { useFormContext } from "react-hook-form";

import { Button, ButtonProps } from "@/components/ui/button";

// components/ui/form-submit-button.tsx

// components/ui/form-submit-button.tsx

// components/ui/form-submit-button.tsx

interface FormSubmitButtonProps extends ButtonProps {
  pendingText?: string;
  defaultText: string;
}

export function FormSubmitButton({
  pendingText,
  defaultText,
  className,
  ...props
}: FormSubmitButtonProps) {
  const { formState } = useFormContext();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update local state based on React Hook Form's isSubmitting state
  useEffect(() => {
    setIsSubmitting(formState.isSubmitting);
  }, [formState.isSubmitting]);

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
