// src/drizzle/seed/system-settings/index.ts
import fs from "fs";
import path from "path";

import { db } from "@/drizzle";
import { systemConfigurations } from "@/drizzle/schema/system-settings";

/**
 * Seed system configuration settings
 */
async function seedSystemSettings() {
  console.log("🌱 Starting system settings seeding process...");
  const dataDirectory = path.join(__dirname, "data");

  try {
    await seedSystemConfigurations(dataDirectory);
    console.log("✅ System settings seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding system settings:", error);
    throw error;
  }
}

/**
 * Seed system configurations
 */
async function seedSystemConfigurations(dataDirectory: string) {
  try {
    const configData = JSON.parse(
      fs.readFileSync(
        path.join(dataDirectory, "system-configurations.json"),
        "utf8"
      )
    );

    for (const config of configData) {
      await db
        .insert(systemConfigurations)
        .values({
          key: config.key,
          value: config.value,
          description: config.description,
        })
        .onConflictDoUpdate({
          target: systemConfigurations.key,
          set: {
            value: config.value,
            description: config.description,
            updatedAt: new Date(),
          },
        });
    }

    console.log("✅ System configurations seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding system configurations:", error);
    throw error;
  }
}

export default seedSystemSettings;

if (require.main === module) {
  seedSystemSettings().catch((error) => {
    console.error("Unhandled error in system settings seeding process:", error);
    process.exit(1);
  });
}
