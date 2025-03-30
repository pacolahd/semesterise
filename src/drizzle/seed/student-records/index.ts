// src/drizzle/seed/institution/index.ts
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

import { db } from "@/drizzle";
import {
  academicSemesters,
  academicWarnings,
  studentCourses,
  studentSemesterMappings,
} from "@/drizzle/schema";

/**
 * Seed all institution tables
 */
async function seedStudentRecords() {
  console.log("🌱 Starting student records seeding process...");
  const dataDirectory = path.join(__dirname, "data");

  try {
    // // 1. Seed student_profiles
    // await seedStudentProfiles(dataDirectory);

    // 2. Seed student_semester_mappings
    await seedSemesterMappings(dataDirectory);

    // 3. Seed student_courses
    await seedStudentCourses(dataDirectory);

    // 4. Seed academic_warnings
    await seedAcademicWarnings(dataDirectory);

    console.log("✅ Student Records seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding student records:", error);
    throw error;
  }
}

/**
 * Seed student_profiles
 */
// async function seedStudentProfiles(dataDirectory: string) {
//   try {
//     const studentProfilesData = JSON.parse(
//       fs.readFileSync(path.join(dataDirectory, "student-profiles.json"), "utf8")
//     );
//
//     for (const student of studentProfilesData as StudentProfileInput[]) {
//       await db
//         .insert(studentProfiles)
//         .values({
//           student_id: student.student_id,
//           authId: student.authId,
//           major_code: student.major_code,
//           math_track_name: student.math_track_name,
//           entry_year: student.entry_year,
//           cohort_year: student.cohort_year,
//           current_year: student.current_year,
//           current_semester: student.current_semester,
//           expected_graduation_date: student.expected_graduation_date,
//           cumulative_gpa: student.cumulative_gpa,
//           total_credits_earned: student.total_credits_earned,
//           capstone_option_id: student.capstone_option_id,
//           isActive: student.isActive,
//           onboarding_completed: student.onboarding_completed,
//         })
//         .onConflictDoNothing({ target: studentProfiles.student_id });
//     }
//     console.log("✅ Student profiles seeded successfully");
//   } catch (error) {
//     console.error("❌ Error seeding student profiles:", error);
//   }
// }

/**
 * Seed semester_mappings
 */
async function seedSemesterMappings(dataDirectory: string) {
  try {
    const mappingsData = JSON.parse(
      fs.readFileSync(
        path.join(dataDirectory, "student-semester-mappings.json"),
        "utf8"
      )
    );

    for (const mapping of mappingsData) {
      // Find academic semester ID from name
      const [semester] = await db
        .select({ id: academicSemesters.id })
        .from(academicSemesters)
        .where(eq(academicSemesters.name, mapping.academic_semester_name));

      if (semester) {
        const { ...mappingValues } = mapping;

        await db
          .insert(studentSemesterMappings)
          .values({
            student_id: mappingValues.student_id,
            program_year: mappingValues.program_year,
            program_semester: mappingValues.program_semester,
            is_summer: mappingValues.is_summer,
            is_verified: mappingValues.is_verified,
            academic_semester_id: semester.id,
          })
          .onConflictDoNothing();
      } else {
        console.error(
          `Academic semester not found for name: ${mapping.academic_semester_name}`
        );
      }
    }
    console.log("✅ Student semester mappings seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding student semester mappings:", error);
  }
}

/**
 * Seed student_courses
 */
async function seedStudentCourses(dataDirectory: string) {
  try {
    const coursesData = JSON.parse(
      fs.readFileSync(path.join(dataDirectory, "student-courses.json"), "utf8")
    );

    for (const course of coursesData) {
      // Find semester ID from name
      const [semester] = await db
        .select({ id: academicSemesters.id })
        .from(academicSemesters)
        .where(eq(academicSemesters.name, course.semester_name));

      if (semester) {
        const { semester_name, ...courseValues } = course;

        await db
          .insert(studentCourses)
          .values({
            ...courseValues,
            semester_id: semester.id,
          })
          .onConflictDoNothing();
      } else {
        console.error(
          `Academic semester not found for name: ${course.semester_name}`
        );
      }
    }
    console.log("✅ Student courses seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding student courses:", error);
  }
} /**
 * Seed academic_warnings
 */
async function seedAcademicWarnings(dataDirectory: string) {
  try {
    const warningsData = JSON.parse(
      fs.readFileSync(
        path.join(dataDirectory, "academic-warnings.json"),
        "utf8"
      )
    );

    for (const warning of warningsData) {
      let semesterId = null;

      // Find semester ID from name if provided
      if (warning.semester_name) {
        const [semester] = await db
          .select({ id: academicSemesters.id })
          .from(academicSemesters)
          .where(eq(academicSemesters.name, warning.semester_name));

        if (semester) {
          semesterId = semester.id;
        }
      }

      const { semester_name, ...warningValues } = warning;

      await db
        .insert(academicWarnings)
        .values({
          ...warningValues,
          semester_id: semesterId,
        })
        .onConflictDoNothing();
    }
    console.log("✅ Academic warnings seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding academic warnings:", error);
  }
}

export default seedStudentRecords;

seedStudentRecords().catch((error) => {
  console.error("Unhandled error in seeding process:", error);
  process.exit(1);
});
