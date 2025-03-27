// src/drizzle/seed/index.ts
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

import { db } from "@/drizzle";
import {
  academicSemesters,
  academicYears,
  capstoneOptions,
  gradeTypes,
  mathTracks,
} from "@/drizzle/schema/academic-structure";
import { departments, majors } from "@/drizzle/schema/institution";

async function main() {
  console.log("🌱 Starting database seeding process...");

  const dataDirectory = path.join(__dirname, "data");

  // 1. Seed Departments
  try {
    const departmentsData = JSON.parse(
      fs.readFileSync(path.join(dataDirectory, "departments.json"), "utf8")
    );

    for (const dept of departmentsData) {
      await db
        .insert(departments)
        .values(dept)
        .onConflictDoNothing({ target: departments.code });
    }
    console.log("✅ Departments seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding departments:", error);
  }

  // 2. Seed Majors
  try {
    const majorsData = JSON.parse(
      fs.readFileSync(path.join(dataDirectory, "majors.json"), "utf8")
    );

    for (const major of majorsData) {
      // Find department ID
      const [dept] = await db
        .select({ id: departments.id })
        .from(departments)
        .where(eq(departments.code, major.departmentCode));

      if (dept) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { departmentCode, ...majorData } = major;
        await db
          .insert(majors)
          .values({
            ...majorData,
            departmentId: dept.id,
          })
          .onConflictDoNothing({ target: majors.code });
      } else {
        console.error(`Department not found for code: ${major.departmentCode}`);
      }
    }
    console.log("✅ Majors seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding majors:", error);
  }

  // 3. Seed Academic Years
  try {
    const academicYearsData = JSON.parse(
      fs.readFileSync(path.join(dataDirectory, "academic-years.json"), "utf8")
    );

    for (const year of academicYearsData) {
      await db
        .insert(academicYears)
        .values({
          ...year,
          startDate: new Date(year.startDate),
          endDate: new Date(year.endDate),
        })
        .onConflictDoNothing({ target: academicYears.yearName });
    }
    console.log("✅ Academic years seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding academic years:", error);
  }

  // 4. Seed Academic Semesters
  try {
    const academicSemestersData = JSON.parse(
      fs.readFileSync(
        path.join(dataDirectory, "academic-semesters.json"),
        "utf8"
      )
    );

    for (const semester of academicSemestersData) {
      // Find academic year ID
      const [year] = await db
        .select({ id: academicYears.id })
        .from(academicYears)
        .where(eq(academicYears.yearName, semester.academicYearName));

      if (year) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { academicYearName, ...semesterData } = semester;
        await db
          .insert(academicSemesters)
          .values({
            ...semesterData,
            academicYearId: year.id,
            startDate: new Date(semester.startDate),
            endDate: new Date(semester.endDate),
          })
          .onConflictDoNothing({ target: academicSemesters.name });
      } else {
        console.error(
          `Academic year not found for: ${semester.academicYearName}`
        );
      }
    }
    console.log("✅ Academic semesters seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding academic semesters:", error);
  }

  // 5. Seed Math Tracks
  try {
    const mathTracksData = JSON.parse(
      fs.readFileSync(path.join(dataDirectory, "math-tracks.json"), "utf8")
    );

    for (const track of mathTracksData) {
      await db
        .insert(mathTracks)
        .values(track)
        .onConflictDoNothing({ target: mathTracks.name });
    }
    console.log("✅ Math tracks seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding math tracks:", error);
  }

  // 6. Seed Grade Types
  try {
    const gradeTypesData = JSON.parse(
      fs.readFileSync(path.join(dataDirectory, "grade-types.json"), "utf8")
    );

    for (const grade of gradeTypesData) {
      await db
        .insert(gradeTypes)
        .values(grade)
        .onConflictDoNothing({ target: gradeTypes.grade });
    }
    console.log("✅ Grade types seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding grade types:", error);
  }

  // 7. Seed Capstone Options
  try {
    const capstoneOptionsData = JSON.parse(
      fs.readFileSync(path.join(dataDirectory, "capstone-options.json"), "utf8")
    );

    for (const option of capstoneOptionsData) {
      await db
        .insert(capstoneOptions)
        .values(option)
        .onConflictDoNothing({ target: capstoneOptions.name });
    }
    console.log("✅ Capstone options seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding capstone options:", error);
  }

  console.log("✅ Database seeding completed successfully!");
}

main()
  .catch((e) => console.error("❌ Seeding failed:", e))
  .finally(() => {
    console.log("Seed script execution finished.");
  });
