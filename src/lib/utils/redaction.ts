// src/lib/utils/redaction.ts

// Helper function to redact sensitive data from logs
export function redactSensitiveData<T extends Record<string, unknown>>(
  data: T,
  sensitiveFields?: string[]
): Partial<T> {
  if (!sensitiveFields || !data) return { ...data };

  const result: Partial<T> = { ...data };

  for (const key in data) {
    if (sensitiveFields.includes(key)) {
      result[key] = "[REDACTED]" as unknown as T[Extract<keyof T, string>];
    }
  }

  return result;
}
