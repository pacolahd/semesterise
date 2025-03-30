import { timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Reusable schema components
 */
export const id = uuid("id").primaryKey().defaultRandom().notNull();
export const createdAt = timestamp("created_at", { withTimezone: true })
  .notNull()
  .defaultNow();
export const updatedAt = timestamp("updated_at", { withTimezone: true })
  .notNull()
  .defaultNow()
  .$onUpdate(() => new Date());
