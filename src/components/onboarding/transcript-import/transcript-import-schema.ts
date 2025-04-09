"use client";

import { z } from "zod";

/**
 * Schema for validating transcript files
 * Must be used only in client components
 */
export const transcriptSchema = z.object({
  transcript: z
    .any()
    .refine(
      (value) => {
        if (typeof window === "undefined") return true;
        return value instanceof FileList && value.length > 0;
      },
      { message: "Please select a file" }
    )
    .refine(
      (value) => {
        if (typeof window === "undefined") return true;
        const file = value?.[0];
        return file?.size <= 10 * 1024 * 1024; // 10MB
      },
      { message: "File size should be less than 10MB" }
    )
    .refine(
      (value) => {
        if (typeof window === "undefined") return true;
        const file = value?.[0];
        return (
          file &&
          (file.type === "application/x-mimearchive" ||
            file.type === "text/html" ||
            file.name.endsWith(".mhtml") ||
            file.name.endsWith(".html"))
        );
      },
      { message: "Only HTML or MHTML files are supported" }
    ),
});
