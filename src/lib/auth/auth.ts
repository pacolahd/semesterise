import { BetterAuthOptions, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { customSession, jwt, openAPI } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/drizzle";
import { authUsers, staffProfiles, studentProfiles } from "@/drizzle/schema";
import * as authSchema from "@/drizzle/schema/auth";
import { AuthUserInputForBetterAuth } from "@/drizzle/schema/auth/auth-users";
import {
  UserRole,
  userRoleValues,
  userRoles,
  userTypeValues,
  userTypes,
} from "@/drizzle/schema/auth/enums";
import { staffEmailRoles } from "@/drizzle/schema/institution";
import { env } from "@/env/server";
import { sendEmail } from "@/lib/actions/email";
import { BetterAuthClientErrorType } from "@/lib/errors/error-types";

const options = {
  appName: "Semesterise",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: authSchema.authUsers,
      session: authSchema.authSessions,
      account: authSchema.authAccounts,
      verification: authSchema.authVerifications,
      jwks: authSchema.authJWKS,
    },
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
      onboardingCompleted: {
        type: "boolean",
        defaultValue: false,
        validator: {
          input: z.boolean(),
          output: z.boolean(),
        },
        input: false,
      },
    },
  },

  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const authUser = user as AuthUserInputForBetterAuth;
          const userEmail = authUser.email.toLowerCase();

          // if (!userEmail.endsWith("@ashesi.edu.gh")) {
          //   throw new Error(
          //     "Invalid email domain. Please use an Ashesi email address."
          //   );
          // }

          try {
            // Check if email is in staff roles table
            const [staffRoles] = await db
              .select({
                role: staffEmailRoles.role,
                departmentCode: staffEmailRoles.departmentCode,
              })
              .from(staffEmailRoles)
              .where(eq(staffEmailRoles.email, userEmail));

            if (staffRoles) {
              // This is a staff member
              authUser.role = staffRoles.role as UserRole;
              authUser.userType = userTypes.staff;
            } else {
              // Default to student
              authUser.role = userRoles.student as UserRole;
              authUser.userType = userTypes.student;
            }

            return {
              data: authUser,
            };
          } catch (error) {
            console.error("Error in user creation before hook:", error);
            throw new Error(
              "Failed to process user registration. Please try again."
            );
          }
        },
        after: async (user) => {
          const authUser = user as AuthUserInputForBetterAuth;

          try {
            if (authUser.userType === userTypes.student) {
              // Create student profile with minimal information
              await db.insert(studentProfiles).values({
                authId: authUser.id,
              });

              // Log successful student profile creation
              console.log(`Student profile created for ${authUser.email}`);
            } else {
              // For staff members, we need to get the department code from the staffEmailRoles table
              const [staffData] = await db
                .select({
                  departmentCode: staffEmailRoles.departmentCode,
                })
                .from(staffEmailRoles)
                .where(eq(staffEmailRoles.email, authUser.email.toLowerCase()));

              if (!staffData) {
                console.error(
                  `Staff email role not found for ${authUser.email}`
                );
                throw new Error(
                  `Staff email role not found for ${authUser.email}`
                );
              }

              // Create staff profile
              await db.insert(staffProfiles).values({
                authId: authUser.id,
                departmentCode: staffData.departmentCode,
              });

              // Log successful staff profile creation
              console.log(
                `Staff profile created for ${authUser.email} with department ${staffData.departmentCode}`
              );
            }
          } catch (error) {
            // Log error but don't fail the operation - the user account is already created
            // You might want to implement a cleanup or retry mechanism
            console.error("Error creating profile after user creation:", error);
          }
        },
      },
    },
  },

  // onAPIError: {
  //   throw: true,
  //   onError: (error) => {
  //     // Custom error handling
  //     console.error("\n\n\n\nAuth error:", error);
  //     ActivityService.recordError({
  //       error,
  //       status: "unhandled",
  //     }).then((e) => console.log("\n\n\n\n\nError logged:", e));
  //   },
  // },

  advanced: {
    // let postgres handle the id generation
    generateId: false,
    cookiePrefix: "better-auth",
    cookies: {
      sessionToken: {
        name: "session_token",
      },
    },
  },
  plugins: [
    openAPI(),
    // jwt({
    //   jwt: {
    //     definePayload: ({ user }) => ({
    //       sub: user.id, // User ID
    //       role: "authenticated", // Supabase-compatible role
    //     }),
    //   },
    // }),

    jwt({
      jwks: {
        keyPairConfig: {
          alg: "EdDSA",
          crv: "Ed25519",
          // Tell BetterAuth to use a fixed key pair
          // Optional: Specify a specific key ID to always use
        },
      },
      jwt: {
        definePayload: ({ user }) => ({
          sub: user.id,
          role: "authenticated",
        }),
        audience: "authenticated",
      },
    }),
    // Add this line to enable the JWKS endpoint
    customSession(async ({ session, user }) => {
      // Get full user data with role - ADD AWAIT HERE
      const userWithRole = await db.query.authUsers.findFirst({
        where: eq(authUsers.id, session.userId),
        columns: { role: true, userType: true, onboardingCompleted: true },
      });

      // let ashesiId: string | null | undefined = null;

      // if (userWithRole?.userType === userTypes.student) {
      //   const studentProfile = await db.query.studentProfiles.findFirst({
      //     where: eq(studentProfiles.authId, user.id),
      //     columns: { studentId: true },
      //   });
      //   ashesiId = studentProfile?.studentId;
      // } else if (userWithRole?.userType === userTypes.staff) {
      //   const staffProfile = await db.query.staffProfiles.findFirst({
      //     where: eq(staffProfiles.authId, user.id),
      //     columns: { staffId: true },
      //   });
      //   ashesiId = staffProfile?.staffId;
      // }

      if (!userWithRole) {
        return { user, session };
      }

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          image: user.image,
          // ashesiId: ashesiId,
          userType: userWithRole.userType,
          role: userWithRole.role,
          onboardingCompleted: userWithRole.onboardingCompleted,
        },
        session,
      };
    }),

    nextCookies(),
  ], // /api/auth/reference
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your password for Semesterise",
        text: `Hey ${user.name.split(" ")[0]}!\nClick the link to reset your password for Semesterise: ${url}`,
        html: `    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
        <div>
            <h2>Hi ${user.name.split(" ")[0]}!</h2>
            <p>We received a request to reset your Semesterise password. Click the button below to set up a new password:</p>
            
            <div style="text-align: center; margin: 35px 0; ">
                <a href="${url}"  style="background-color: #004eb4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
            </div>

            <p  style="font-size: 14px;">
                This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.
            </p>
        </div>

        <div style="margin-top: 20px;">
            <p>Sent by Semesterise • <a href="http://localhost:3000/" style="background-color: #004eb4; color: white; padding: 5px 10px; text-decoration: none; border-radius: 10px;">Visit Website</a></p>
            <p>This is <span style="color: darkblue"> Ryan Tangu Mbun Tangwe's </span> Applied Capstone Project. An integrated platform for degree auditing and petition processing at Ashesi University.</p>
     
            <p >
                © ${new Date().getFullYear()} Semesterise. All rights reserved.
            </p>
        </div>
    </div>
`,
      });
    },
    resetPasswordTokenExpiresIn: 3600,
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
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
            <h2 style="color: #004eb4; text-align: center;">Verify Your Semesterise Account</h2>
            <p>Thank you for creating an account with Semesterise. Please verify your email address to continue.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="background-color: #004eb4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                Verify Email Address
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">This link will expire in 1 hour. If you didn't create an account, please ignore this email.</p>
            <div style="margin-top: 20px;">
              <p>Sent by Semesterise • <a href="http://localhost:3000/" style="background-color: #004eb4; color: white; padding: 5px 10px; text-decoration: none; border-radius: 10px;">Visit Website</a></p>
              <p>This is <span style="color: darkblue"> Ryan Tangu Mbun Tangwe's </span> Applied Capstone Project. An integrated platform for degree auditing and petition processing at Ashesi University.</p>
       
              <p >
                  © ${new Date().getFullYear()} Semesterise. All rights reserved.
              </p>
            </div>
          </div>
        `,
      });
    },
  },
} satisfies BetterAuthOptions;

export const auth = betterAuth({
  ...options,
  plugins: [
    ...(options.plugins ?? []),
    customSession(async ({ user, session }) => {
      // now both user and session will infer the fields added by plugins and your custom fields
      return {
        user,
        session,
      };
    }, options), // pass options here
  ],
});

export type ServerSession = typeof auth.$Infer.Session;
export type ServerSessionUser = ServerSession["user"];
export type ServerSessionSession = ServerSession["session"];
export type ServerSessionResult = {
  data: ServerSession | null; // Or ServerSession | undefined depending on your case
  error: BetterAuthClientErrorType; // Adjust the error type as needed
};
