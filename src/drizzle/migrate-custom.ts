// drizzle/migrate-custom.ts
import config from "$/drizzle.config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

import * as schema from "@/drizzle/schema/institution";
import { env } from "@/env/server";

// Validate migration folder is configured
if (!config.out) {
  console.error("Migration folder not specified in drizzle.config");
  process.exit(1);
}

console.log(`Running migrations from ${config.out}...`);

// Create a dedicated migration pool with max=1
const migrationPool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 1, // Limit connections for migrations
});

// Create a migration-specific drizzle instance
const migrationClient = drizzle(migrationPool, { schema });

migrate(migrationClient, { migrationsFolder: config.out })
  .then(() => {
    console.log("Migration completed successfully");
  })
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await migrationPool.end();
    console.log("Database connection closed");
  });
