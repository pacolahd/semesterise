// src/drizzle/truncate-tables.ts
import { sql } from "drizzle-orm";
import prompts from "prompts";

import { db, pool } from "@/drizzle";

async function truncateAllTables() {
  console.log("\n┌────────────────────────────────┐");
  console.log("│  TRUNCATE ALL TABLES WARNING   │");
  console.log("└────────────────────────────────┘\n");

  console.log(
    "⚠️  WARNING: This will permanently delete all data from all tables in the public schema, but will preserve the structure.\n\n---------- i.e. It will keep all tables but remove all data ---------- \n"
  );

  // Skip confirmation if --force flag is provided
  const shouldConfirm = !process.argv.includes("--force");

  if (shouldConfirm) {
    const response = await prompts({
      type: "confirm",
      name: "value",
      message: "Are you sure you want to truncate all tables?",
      initial: false, // Default to "No" for safety
    });

    if (!response.value) {
      console.log("Table truncation aborted.");
      process.exit(0);
    }
  }

  console.log("Proceeding with truncation of all tables...\n");

  try {
    // Disable foreign key checks
    await db.execute(sql`SET session_replication_role = 'replica';`);

    // Get all tables EXCEPT drizzle migration tables
    console.log("Finding tables to truncate...");
    const tablesResult = await db.execute(sql`
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename NOT LIKE 'drizzle%';
    `);

    if (tablesResult.rows.length === 0) {
      console.log("No tables found to truncate");
      return;
    }

    console.log(`Found ${tablesResult.rows.length} tables to truncate`);

    // Truncate each table
    for (const row of tablesResult.rows) {
      const table = row.tablename;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      const tableIdentifier = sql.identifier(table);
      await db.execute(sql`TRUNCATE TABLE ${tableIdentifier} CASCADE;`);
      console.log(`✓ Truncated table: ${table}`);
    }

    // Re-enable foreign key checks
    await db.execute(sql`SET session_replication_role = 'origin';`);

    console.log("\n✅ All tables truncated successfully!");
  } catch (error) {
    console.error("Error truncating tables:", error);
  } finally {
    await pool.end();
  }
}

truncateAllTables().catch((error) => {
  console.error("Unhandled error during table truncation:", error);
  process.exit(1);
});
