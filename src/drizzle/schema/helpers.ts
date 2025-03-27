import { timestamp, uuid } from "drizzle-orm/pg-core";

import { courseStatusEnum } from "./curriculum/enums";

/**
 * Reusable schema components
 */
export const id = uuid("id").primaryKey().defaultRandom();
export const createdAt = timestamp("created_at", { withTimezone: true })
  .notNull()
  .defaultNow();
export const updatedAt = timestamp("updated_at", { withTimezone: true })
  .notNull()
  .defaultNow()
  .$onUpdate(() => new Date());

/**
 * Common enums
 */

/**
 * Export all shared components
 */
export { courseStatusEnum };
