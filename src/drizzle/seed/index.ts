import seedSystemSettings from "@/drizzle/seed/system-settings";

import seedAcademicStructure from "./academic-structure";
import seedCurriculum from "./curriculum";
import seedInstitution from "./institution";

async function main() {
  console.log("🌱 Starting database seeding process...");

  try {
    // 1. First seed the System Settings
    await seedSystemSettings();

    // 2. First seed the academic structure
    await seedAcademicStructure();

    // 3. Then seed institution data
    await seedInstitution();

    // // 4. Then seed curriculum data
    // await seedCurriculum();

    // // 5. Finally, seed student-records data
    // await seedStudentRecords();

    console.log("✅ Database seeding completed successfully!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    console.log("Seed script execution finished.");
  }
}

main().catch((error) => {
  console.error("Unhandled error in seeding process:", error);
  process.exit(1);
});
