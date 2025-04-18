// src/drizzle/db-reset.ts
import { sql } from "drizzle-orm";
import { emptyDirSync, existsSync } from "fs-extra";
import * as path from "path";
import prompts from "prompts";

import { db, pool } from "@/drizzle";

async function resetDatabase() {
  console.log("");
  console.log("┌───────────────────────────────────────┐");
  console.log("│  COMPLETE SEMESTERISE DATABASE RESET  │");
  console.log("└───────────────────────────────────────┘");
  console.log("");

  // Show warning and get confirmation
  console.log("⚠️  WARNING: This will permanently delete:");
  console.log("   - ALL tables and data in the Semesterise database");
  console.log("   - ALL migration files in the migrations directory");
  console.log("   - Drizzle's migration tracking schema in the database");
  console.log("\n⚠️  This action CANNOT be undone!\n");

  // Skip confirmation if --force flag is provided
  const shouldConfirm = !process.argv.includes("--force");

  if (shouldConfirm) {
    const response = await prompts({
      type: "confirm",
      name: "value",
      message: "Are you sure you want to completely reset the database?",
      initial: false, // Default to "No" for safety
    });

    if (!response.value) {
      console.log("Database reset aborted.");
      process.exit(0);
    }
  }

  console.log("Proceeding with complete database reset...\n");

  try {
    // Part 1: Reset the database
    await dropDatabaseSchema();

    // Part 2: Clear migration files
    clearMigrationFiles();

    // Show completion message
    printHeader("DATABASE RESET COMPLETE");
    console.log("Your database has been completely reset. Next steps:");
    console.log("1. Generate new migrations:  npm run db:generate");
    console.log("2. Apply migrations:         npm run db:migrate");
    console.log("");
    console.log("Or simply push schema directly:");
    console.log("   npm run db:push");
  } catch (error) {
    console.error("Error during database reset:", error);
    process.exit(1);
  }
}

async function dropDatabaseSchema() {
  printHeader("STEP 1: DROPPING DATABASE SCHEMA");

  try {
    // Disable foreign key checks
    await db.execute(sql`SET session_replication_role = 'replica';`);

    // 1. Drop all views
    console.log("\nDropping all views...");
    const viewsResult = await db.execute(sql`
      SELECT table_name FROM information_schema.views WHERE table_schema = 'public';
    `);
    for (const row of viewsResult.rows) {
      const typeName = String(row.typname); // Explicitly cast to string

      await db.execute(
        sql`DROP VIEW IF EXISTS public.${sql.identifier(typeName)} CASCADE;`
      );
      console.log(`✓ Dropped view: ${row.table_name}`);
    }

    // 2. Drop all tables
    console.log("\nDropping all tables...");
    const tablesResult = await db.execute(sql`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public';
    `);
    for (const table of tablesResult.rows.map((r) => r.tablename)) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      const tableIdentifier = sql.identifier(table); // Explicitly cast to string

      await db.execute(
        sql`DROP TABLE IF EXISTS public.${tableIdentifier} CASCADE;`
      );
      console.log(`✓ Dropped table: ${table}`);
    }

    // 3. Drop all custom types
    // 3. Drop all custom types
    console.log("\nDropping all types...");
    const typesResult = await db.execute(sql`
  SELECT typname FROM pg_type 
  JOIN pg_namespace ON pg_type.typnamespace = pg_namespace.oid
  WHERE pg_namespace.nspname = 'public' AND pg_type.typtype = 'e'; -- ENUM types
`);

    for (const row of typesResult.rows) {
      const typeName = String(row.typname); // Explicitly cast to string
      await db.execute(
        sql`DROP TYPE IF EXISTS public.${sql.identifier(typeName)} CASCADE;`
      );
      console.log(`✓ Dropped type: ${typeName}`);
    }

    // 4. Drop the drizzle schema
    console.log("\nDropping drizzle schema...");
    await db.execute(sql`DROP SCHEMA IF EXISTS "drizzle" CASCADE;`);
    console.log("✓ Dropped drizzle schema");

    // Re-enable foreign key checks
    await db.execute(sql`SET session_replication_role = 'origin';`);

    console.log("\nDatabase schema successfully dropped");
  } catch (error) {
    console.error("Error dropping database schema:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

function clearMigrationFiles() {
  printHeader("STEP 2: CLEARING MIGRATION FILES");

  // Update to correct path
  const directory = path.resolve(process.cwd(), "src/drizzle/migrations");
  console.log(`Looking for migrations in: ${directory}`);

  if (existsSync(directory)) {
    try {
      // List files before clearing
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require("fs");
      const files = fs.readdirSync(directory);

      if (files.length === 0) {
        console.log("Migrations folder is already empty.");
      } else {
        console.log(`Found ${files.length} files/folders to remove`);

        // Empty the directory
        emptyDirSync(directory);
        console.log("✓ All migration files cleared successfully");
      }
    } catch (error) {
      console.error("Error clearing migrations directory:", error);
      throw error;
    }
  } else {
    console.log("⚠️ Migrations folder does not exist at this location.");
    console.log("Please check your drizzle configuration.");
  }
}

function printHeader(title: string) {
  const line = "─".repeat(title.length + 8);
  console.log(`\n┌${line}┐`);
  console.log(`│   ${title}   │`);
  console.log(`└${line}┘\n`);
}

// Run the reset function
resetDatabase().catch((error) => {
  console.error("Unhandled error during database reset:", error);
  process.exit(1);
});
