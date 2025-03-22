// drizzle/index.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "@/drizzle/schema";
import { env } from "@/env/server";

// Create application pool with default settings
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  // Add any application-specific pool settings here
  // Example: idle_timeout: 30000, connection_timeout: 2000
});

// Create the db instance
export const db = drizzle(pool, { schema, logger: true });

// Export pool for potential direct access
export { pool };

export type DB = typeof db;
