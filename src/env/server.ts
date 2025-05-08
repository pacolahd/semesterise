import { createEnv } from "@t3-oss/env-nextjs";
import { config } from "dotenv";
import { expand } from "dotenv-expand";
import { ZodError, z } from "zod";

expand(config());

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "production"]),
    DB_HOST: z.string(),
    DB_USER: z.string(),
    DB_PASSWORD: z.string(),
    DB_NAME: z.string(),
    DB_PORT: z.coerce.number().min(4),
    DATABASE_URL: z.string().url(),
    BETTER_AUTH_SECRET: z.string(),
    BETTER_AUTH_URL: z.string().url(),
    EMAIL_VERIFICATION_CALLBACK_URL: z.string().url(),
    RESEND_API_KEY: z.string(),
    EMAIL_FROM: z.string(),
    FLASK_API_URL: z.string().url(),
    UPLOADTHING_SECRET: z.string().min(1),
    UPLOADTHING_APP_ID: z.string().min(1),
  },
  onValidationError: (error: ZodError) => {
    console.error(
      "❌ Invalid environment variables:",
      error.flatten().fieldErrors
    );
    // If running in Node (process.exit exists), exit; otherwise, throw an error.
    if (typeof process !== "undefined" && typeof process.exit === "function") {
      process.exit(1);
    } else {
      throw new Error(
        `Invalid environment variables: ${JSON.stringify(error.flatten().fieldErrors)}`
      );
    }
  },

  emptyStringAsUndefined: true,
  // eslint-disable-next-line no-process-env
  experimental__runtimeEnv: process.env,
});
