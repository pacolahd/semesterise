// src/drizzle/schema/auth/index.ts
export {
  authUsers,
  authUserSchema,
  authUserSchemaForBetterAuth,
} from "./auth-users";

export { authSessions, authSessionSchema } from "./auth-sessions";

export { authAccounts, authAccountSchema } from "./auth-accounts";

export {
  authVerifications,
  authVerificationSchema,
} from "./auth-verifications";

export { userTypeEnum, userRoleEnum } from "./enums";

// Relations
export * from "./relations";
