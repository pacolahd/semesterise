import { APIError, BetterAuthOptions, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI } from "better-auth/plugins";
import { z } from "zod";

import { sendEmail } from "@/actions/email";
import { db } from "@/drizzle";
import * as authSchema from "@/drizzle/schema/auth";
import {
  userRoleValues,
  userRoles,
  userTypeValues,
  userTypes,
} from "@/drizzle/schema/institution/enums";
import { env } from "@/env/server";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  user: {
    additionalFields: {
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
    },
  },

  databaseHooks: {
    user: {
      create: {
        before: async (user, ctx) => {
          const nameParts = user.name.split(" ");
          return {
            data: {
              ...user,
              firstName: nameParts[0],
              lastName: nameParts[1],
            },
          };
        },
        after: async (user) => {
          // perform additional actions, like creating the student or staff profile
        },
      },
    },
  },
  plugins: [openAPI()], // /api/auth/reference
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, token }) => {
      const verificationUrl = `${env.BETTER_AUTH_URL}/api/auth/verify-email?token=${token}&callbackURL=${env.EMAIL_VERIFICATION_CALLBACK_URL}`;
      await sendEmail({
        to: user.email,
        subject: "Verify your email address",
        text: `Click the link to verify your email: ${verificationUrl}`,
      });
    },
  },
} satisfies BetterAuthOptions);
