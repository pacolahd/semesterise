// src/drizzle/seed/academic-structure/index.ts
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

/**
 * Seed all academic structure tables
 */
async function seedAcademicStructure() {
  console.log("🌱 Starting academic structure seeding process...");
  const dataDirectory = path.join(__dirname, "data");

  try {
    // // 1. Seed Academic Years
    // await seedAcademicYears(dataDirectory);

    // 2. Seed Academic Semesters
    await seedAcademicSemesters(dataDirectory);

    // // 3. Seed Math Tracks
    // await seedMathTracks(dataDirectory);
    //
    // // 4. Seed Grade Types
    // await seedGradeTypes(dataDirectory);
    //
    // // 5. Seed Capstone Options
    // await seedCapstoneOptions(dataDirectory);

    console.log("✅ Academic structure seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding academic structure:", error);
    throw error;
  }
}

/**
 * Seed academic years
 */
async function seedAcademicYears(dataDirectory: string) {
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
          isCurrent: year.isCurrent,
        })
        .onConflictDoNothing({ target: academicYears.yearName });
    }

    console.log("✅ Academic years seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding academic years:", error);
    throw error;
  }
}

/**
 * Seed academic semesters
 */
async function seedAcademicSemesters(dataDirectory: string) {
  try {
    const academicSemestersData = JSON.parse(
      fs.readFileSync(
        path.join(dataDirectory, "academic-semesters.json"),
        "utf8"
      )
    );

    for (const semester of academicSemestersData) {
      // Find academic year name using the yearName
      const [year] = await db
        .select({ name: academicYears.yearName })
        .from(academicYears)
        .where(eq(academicYears.yearName, semester.academicYearName));

      if (year) {
        const { ...semesterData } = semester;

        await db
          .insert(academicSemesters)
          .values({
            ...semesterData,
            academicYearName: year.name,
            name: semester.name,
            sequenceNumber: semester.sequenceNumber,
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
    throw error;
  }
}

/**
 * Seed math tracks
 */
async function seedMathTracks(dataDirectory: string) {
  try {
    const mathTracksData = JSON.parse(
      fs.readFileSync(path.join(dataDirectory, "math-tracks.json"), "utf8")
    );

    for (const track of mathTracksData) {
      await db
        .insert(mathTracks)
        .values({
          name: track.name,
          description: track.description,
          requiredCoursesCount: track.requiredCoursesCount,
        })
        .onConflictDoNothing({ target: mathTracks.name });
    }

    console.log("✅ Math tracks seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding math tracks:", error);
    throw error;
  }
}

/**
 * Seed grade types
 */
async function seedGradeTypes(dataDirectory: string) {
  try {
    const gradeTypesData = JSON.parse(
      fs.readFileSync(path.join(dataDirectory, "grade-types.json"), "utf8")
    );

    for (const grade of gradeTypesData) {
      await db
        .insert(gradeTypes)
        .values({
          grade: grade.grade,
          numericValue: grade.numericValue,
          description: grade.description,
          isPassing: grade.isPassing,
        })
        .onConflictDoNothing({ target: gradeTypes.grade });
    }

    console.log("✅ Grade types seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding grade types:", error);
    throw error;
  }
}

/**
 * Seed capstone options
 */
async function seedCapstoneOptions(dataDirectory: string) {
  try {
    const capstoneOptionsData = JSON.parse(
      fs.readFileSync(path.join(dataDirectory, "capstone-options.json"), "utf8")
    );

    for (const option of capstoneOptionsData) {
      await db
        .insert(capstoneOptions)
        .values({
          name: option.name,
          description: option.description,
          firstSemesterCode: option.firstSemesterCode,
          secondSemesterCode: option.secondSemesterCode,
          requiresExtraElective: option.requiresExtraElective,
        })
        .onConflictDoUpdate({
          target: capstoneOptions.name,
          set: {
            description: option.description,
            firstSemesterCode: option.firstSemesterCode,
            secondSemesterCode: option.secondSemesterCode,
            requiresExtraElective: option.requiresExtraElective,
            updatedAt: new Date(),
          },
        });
    }

    console.log("✅ Capstone options seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding capstone options:", error);
    throw error;
  }
}

export default seedAcademicStructure;

seedAcademicStructure().catch((error) => {
  console.error("Unhandled error in seeding process:", error);
  process.exit(1);
});
