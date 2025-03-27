// src/drizzle/seed/institution/index.ts
import fs from "fs";
import path from "path";

import { db } from "@/drizzle";
import { departments, majors } from "@/drizzle/schema/institution";

/**
 * Seed all institution tables
 */
async function seedInstitution() {
  console.log("🌱 Starting institution seeding process...");
  const dataDirectory = path.join(__dirname, "data");

  try {
    // 1. Seed Departments
    await seedDepartments(dataDirectory);

    // 2. Seed Majors
    await seedMajors(dataDirectory);

    console.log("✅ Institution seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding institution:", error);
    throw error;
  }
}

/**
 * Seed departments
 */
async function seedDepartments(dataDirectory: string) {
  try {
    const departmentsData = JSON.parse(
      fs.readFileSync(path.join(dataDirectory, "departments.json"), "utf8")
    );

    for (const dept of departmentsData) {
      await db
        .insert(departments)
        .values({
          code: dept.code,
          name: dept.name,
          description: dept.description,
        })
        .onConflictDoNothing({ target: departments.code });
    }

    console.log("✅ Departments seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding departments:", error);
    throw error;
  }
}

/**
 * Seed majors
 */
async function seedMajors(dataDirectory: string) {
  try {
    const majorsData = JSON.parse(
      fs.readFileSync(path.join(dataDirectory, "majors.json"), "utf8")
    );

    for (const major of majorsData) {
      await db
        .insert(majors)
        .values({
          code: major.code,
          name: major.name,
          degree: major.degree,
          description: major.description,
          departmentCode: major.departmentCode,
        })
        .onConflictDoNothing({ target: majors.code });
    }

    console.log("✅ Majors seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding majors:", error);
    throw error;
  }
}

export default seedInstitution;

seedInstitution().catch((error) => {
  console.error("Unhandled error in seeding process:", error);
  process.exit(1);
});
