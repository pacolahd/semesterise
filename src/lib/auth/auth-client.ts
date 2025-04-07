import {
  customSessionClient,
  inferAdditionalFields,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { z } from "zod";

import {
  userRoleValues,
  userRoles,
  userTypeValues,
  userTypes,
} from "@/drizzle/schema/auth/enums";
// import { env } from "@/env/server";
import { auth } from "@/lib/auth/auth";
import { BetterAuthClientErrorType } from "@/lib/auth/auth-error-utils";

export const authClient = createAuthClient({
  /** the base url of the server (optional if you're using the same domain) */
  // eslint-disable-next-line no-process-env
  baseURL: process.env.BETTER_AUTH_URL,
  plugins: [
    inferAdditionalFields({
      user: {
        role: {
          type: "string",
          required: true,
          defaultValue: userRoles.student,
          validator: {
            input: z.enum(userRoleValues),
            output: z.enum(userRoleValues),
          },
          input: false, // Don't allow users to set their own role
        },
        userType: {
          type: "string",
          required: true,
          defaultValue: userTypes.student, // Either "student" or "staff"
          validator: {
            input: z.enum(userTypeValues),
            output: z.enum(userTypeValues),
          },
          input: false,
        },
        onboardingCompleted: {
          type: "boolean",
          required: true,
          defaultValue: false,
          validator: {
            input: z.boolean(),
            output: z.boolean(),
          },
          input: false,
        },
      },
    }),
    customSessionClient<typeof auth>(),
  ],
});
export type ClientSession = typeof authClient.$Infer.Session;
export type ClientSessionResult = {
  data: ClientSession | null; // Or ServerSession | undefined depending on your case
  error: BetterAuthClientErrorType; // Adjust the error type as needed
};
