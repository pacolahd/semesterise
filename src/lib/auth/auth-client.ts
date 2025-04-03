import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { env } from "@/env/server";
import { auth } from "@/lib/auth/auth";

export const authClient = createAuthClient({
  /** the base url of the server (optional if you're using the same domain) */
  // eslint-disable-next-line no-process-env
  baseURL: process.env.BETTER_AUTH_URL,
  plugins: [inferAdditionalFields<typeof auth>()],
});
// export type Session = typeof authClient.$Infer.Session;
