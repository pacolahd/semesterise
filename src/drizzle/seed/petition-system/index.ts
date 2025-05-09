// src/drizzle/seed/petition-system/index.ts
import fs from "fs";
import path from "path";

import { db } from "@/drizzle";
import { petitionTypes } from "@/drizzle/schema/petition-system";

/**
 * Seed petition system data
 */
export async function seedPetitionSystem() {
  console.log("🌱 Starting petition system seeding process...");
  const dataDirectory = path.join(__dirname, "data");

  try {
    await seedPetitionTypes(dataDirectory);
    console.log("✅ Petition system seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding petition system:", error);
    throw error;
  }
}

/**
 * Seed petition types
 */
async function seedPetitionTypes(dataDirectory: string) {
  try {
    const petitionTypesData = JSON.parse(
      fs.readFileSync(path.join(dataDirectory, "petition-types.json"), "utf8")
    );

    for (const type of petitionTypesData) {
      await db
        .insert(petitionTypes)
        .values({
          code: type.code,
          name: type.name,
          description: type.description,
          requiresParentSignature: type.requiresParentSignature,
          requiresLecturerSignature: type.requiresLecturerSignature,
          requiresAcademicPlan: type.requiresAcademicPlan,
          customFields: type.customFields,
        })
        .onConflictDoUpdate({
          target: petitionTypes.code,
          set: {
            name: type.name,
            description: type.description,
            requiresParentSignature: type.requiresParentSignature,
            requiresLecturerSignature: type.requiresLecturerSignature,
            requiresAcademicPlan: type.requiresAcademicPlan,
            customFields: type.customFields,
            updatedAt: new Date(),
          },
        });
      console.log(`Seeded petition type: ${type.name}`);
    }

    console.log("✅ Petition types seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding petition types:", error);
    throw error;
  }
}

export default seedPetitionSystem;

if (require.main === module) {
  seedPetitionSystem().catch((error) => {
    console.error("Unhandled error in petition system seeding process:", error);
    process.exit(1);
  });
}
