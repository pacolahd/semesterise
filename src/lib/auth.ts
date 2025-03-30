import { BetterAuthOptions, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { sendEmail } from "@/actions/email";
import { db } from "@/drizzle";
import {
  staffEmailRoles,
  staffProfiles,
  studentProfiles,
} from "@/drizzle/schema";
import * as authSchema from "@/drizzle/schema/auth";
import { AuthUserInput } from "@/drizzle/schema/auth/auth-users";
import {
  UserRole,
  userRoleValues,
  userRoles,
  userTypeValues,
  userTypes,
} from "@/drizzle/schema/auth/enums";
import { env } from "@/env/server";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: authSchema.authUsers,
      session: authSchema.authSessions,
      account: authSchema.authAccounts,
      verification: authSchema.authVerifications,
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
    },
  },

  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const authUser = user as AuthUserInput;
          const userEmail = authUser.email.toLowerCase();

          // Ensure email domain is valid
          if (!userEmail.endsWith("@ashesi.edu.gh")) {
            throw new Error(
              "Only Ashesi University email addresses are allowed."
            );
          }

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
          const authUser = user as AuthUserInput;

          try {
            if (authUser.userType === userTypes.student) {
              // Create student profile with minimal information
              await db.insert(studentProfiles).values({
                authId: authUser.id,
                isActive: true,
                onboarding_completed: false,
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
  advanced: {
    // let postgres handle the id generation
    generateId: false,
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
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
            <h2 style="color: #004eb4; text-align: center;">Verify Your Semesterise Account</h2>
            <p>Thank you for creating an account with Semesterise. Please verify your email address to continue.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="background-color: #004eb4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                Verify Email Address
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">If you didn't create an account, please ignore this email.</p>
          </div>
        `,
      });
    },
  },
} satisfies BetterAuthOptions);
export type Session = typeof auth.$Infer.Session;
