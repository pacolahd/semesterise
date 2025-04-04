// src/components/forms/auth-form-item.tsx
import { ReactNode } from "react";

import { ControllerRenderProps, FieldPath, FieldValues } from "react-hook-form";

import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface FormInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  label: string;
  field: ControllerRenderProps<TFieldValues, TName>;
  type?: string;
  placeholder?: string;
  className?: string;
  labelClassName?: string;
  required?: boolean;
  description?: ReactNode;
  rightSideLabel?: ReactNode;
}

export function AuthFormItem<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  label,
  field,
  type = "text",
  placeholder,
  className = "",
  labelClassName = "body2-medium",
  required = false,
  description,
  rightSideLabel = null,
}: FormInputProps<TFieldValues, TName>) {
  return (
    <FormItem>
      {rightSideLabel == null ? (
        <FormLabel className={labelClassName}>
          {label}
          {required && <span className="text-destructive"> *</span>}
        </FormLabel>
      ) : (
        <div className="flex items-center justify-between">
          <FormLabel className={labelClassName}>
            {label}
            {required && <span className="text-destructive"> *</span>}
          </FormLabel>
          {rightSideLabel}
        </div>
      )}

      {description && (
        <div className="text-xs text-muted-foreground">{description}</div>
      )}
      <FormControl>
        <Input
          type={type}
          placeholder={placeholder}
          className={`h-12 rounded-lg bg-white dark:bg-[--background] ${className}`}
          {...field}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}
