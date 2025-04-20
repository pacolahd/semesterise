// src/drizzle/seed/curriculum/index.ts
import fs from "fs";
import path from "path";

import { db } from "@/drizzle";
import {
  courseCategories,
  courseCategorization,
  courseGradeRequirements,
  courses,
  degreeRequirements,
  prerequisiteCourses,
  prerequisiteGroups,
} from "@/drizzle/schema/curriculum";
import { CourseCategoryInput } from "@/drizzle/schema/curriculum/course-categories";
import { CourseGradeRequirementInput } from "@/drizzle/schema/curriculum/course-grade-requirements";
import {
  SemesterOffering,
  semesterOfferingValues,
} from "@/drizzle/schema/curriculum/enums";
import { PrerequisiteCourseInput } from "@/drizzle/schema/curriculum/prerequisite-courses";
import { PrerequisiteGroupInput } from "@/drizzle/schema/curriculum/prerequisite-groups";

/**
 * Main seeding function for all curriculum tables
 */
export async function seedCurriculum() {
  console.log("🌱 Starting curriculum seeding process...");
  const dataDirectory = path.join(__dirname, "data");

  try {
    // 1. Course Categories
    await seedCourseCategories(dataDirectory);

    // 2. Courses
    await seedCourses(dataDirectory);

    // 3. Prerequisites
    await seedPrerequisites(dataDirectory);

    // 5. Degree Requirements
    await seedDegreeRequirements(dataDirectory);

    // 6. Course Categorizations
    await seedCourseCategorizations(dataDirectory);

    // 7. Course Grade Requirements
    await seedCourseGradeRequirements(dataDirectory);

    console.log("✅ Curriculum seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding curriculum:", error);
    throw error;
  }
}

/**
 * Seed course categories with proper parent-child relationships
 */
async function seedCourseCategories(dataDirectory: string) {
  try {
    const categoriesData = JSON.parse(
      fs.readFileSync(
        path.join(dataDirectory, "course-categories.json"),
        "utf8"
      )
    );

    // First pass: Insert parent categories (those with null parentCategoryName)
    const parentCategories = categoriesData.filter(
      (cat: CourseCategoryInput) => !cat.parentCategoryName
    );
    for (const category of parentCategories) {
      await db
        .insert(courseCategories)
        .values({
          name: category.name,
          parentCategoryName: null,
          description: category.description || null,
          displayOrder: category.displayOrder || 0,
        })
        .onConflictDoNothing({ target: courseCategories.name });
    }

    // Second pass: Insert child categories (those with parentCategoryId)
    const childCategories = categoriesData.filter(
      (cat: CourseCategoryInput) => cat.parentCategoryName
    );
    for (const category of childCategories) {
      await db
        .insert(courseCategories)
        .values({
          name: category.name,
          parentCategoryName: category.parentCategoryName, // Now using the name as foreign key
          description: category.description || null,
          displayOrder: category.displayOrder || 0,
        })
        .onConflictDoNothing({ target: courseCategories.name });
    }

    console.log("✅ Course categories seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding course categories:", error);
    throw error;
  }
}

/**
 * Seed courses with derived attributes
 */
async function seedCourses(dataDirectory: string) {
  try {
    // Load all department course data files
    const csisCoursesData = JSON.parse(
      fs.readFileSync(path.join(dataDirectory, "csis-courses.json"), "utf8")
    );
    const businessCoursesData = JSON.parse(
      fs.readFileSync(path.join(dataDirectory, "business-courses.json"), "utf8")
    );
    const engineeringCoursesData = JSON.parse(
      fs.readFileSync(
        path.join(dataDirectory, "engineering-courses.json"),
        "utf8"
      )
    );
    const humanitiesCoursesData = JSON.parse(
      fs.readFileSync(
        path.join(dataDirectory, "humanities-courses.json"),
        "utf8"
      )
    );

    // Combine all course data
    const allCoursesData = [
      ...csisCoursesData,
      ...businessCoursesData,
      ...engineeringCoursesData,
      ...humanitiesCoursesData,
    ];

    for (const courseData of allCoursesData) {
      const level = deriveCourseLevel(courseData.code);
      const departmentCode = deriveDepartmentCode(courseData.code);

      // Convert semesters to lowercase before checking against the enum values
      const offeredInSemesters: SemesterOffering[] = Array.isArray(
        courseData.semestersOffered
      )
        ? courseData.semestersOffered
            .map((s: SemesterOffering) => s.toLowerCase()) // ✅ Convert each semester to lowercase
            .filter((s: SemesterOffering): s is SemesterOffering =>
              semesterOfferingValues.includes(s as SemesterOffering)
            ) // ✅ Type guard to ensure valid enum values
        : [];

      if (offeredInSemesters.length === 0) {
        console.warn(
          `⚠️ No valid semester offerings for ${courseData.code}, skipping`
        );
        continue;
      }

      const courseToInsert = {
        code: courseData.code,
        title: courseData.title,
        description: courseData.description || null,
        credits: courseData.credits,
        level,
        departmentCode,
        prerequisiteText: courseData.prerequisites || null,
        status: courseData.status || "active",
        countsForGpa: courseData.countsForGpa ?? true,
        offeredInSemesters, // ✅ Now correctly an array of enums
      };

      await db
        .insert(courses)
        .values(courseToInsert)
        .onConflictDoNothing({ target: courses.code });
    }

    console.log("✅ Courses seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding courses:", error);
    throw error;
  }
}

/**
 * Seed prerequisite groups and courses
 */
async function seedPrerequisites(dataDirectory: string) {
  try {
    // Load prerequisite data
    const prerequisiteGroupsData: PrerequisiteGroupInput[] = JSON.parse(
      fs.readFileSync(
        path.join(dataDirectory, "prerequisite-groups.json"),
        "utf8"
      )
    );
    const prerequisiteCoursesData: PrerequisiteCourseInput[] = JSON.parse(
      fs.readFileSync(
        path.join(dataDirectory, "prerequisite-courses.json"),
        "utf8"
      )
    );

    // First insert prerequisite groups
    for (const group of prerequisiteGroupsData) {
      await db
        .insert(prerequisiteGroups)
        .values({
          groupKey: group.groupKey,
          courseCode: group.courseCode,
          groupName: group.groupName,
          externalLogicOperator: group.externalLogicOperator || "AND",
          internalLogicOperator: group.internalLogicOperator || "OR",
          description: group.description || null,
          isConcurrent: group.isConcurrent || false,
          isRecommended: group.isRecommended || false,
          groupMinimumGrade: group.groupMinimumGrade || null,
          sortOrder: group.sortOrder || 0,
          nonCourseRequirement: group.nonCourseRequirement || null,
          cohortYearStart: group.cohortYearStart || null,
          cohortYearEnd: group.cohortYearEnd || null,
        })
        .onConflictDoNothing({ target: prerequisiteGroups.groupKey });
    }

    // Then insert prerequisite courses
    for (const prerequisite of prerequisiteCoursesData) {
      await db
        .insert(prerequisiteCourses)
        .values({
          groupKey: prerequisite.groupKey,
          prerequisiteCourseCode: prerequisite.prerequisiteCourseCode,
          description: prerequisite.description || null,
        })
        .onConflictDoNothing();
    }

    console.log("✅ Prerequisites seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding prerequisites:", error);
    throw error;
  }
}

/**
 * Seed degree requirements for each major
 */
async function seedDegreeRequirements(dataDirectory: string) {
  try {
    const requirementsData = JSON.parse(
      fs.readFileSync(
        path.join(dataDirectory, "degree-requirements.json"),
        "utf8"
      )
    );

    for (const requirement of requirementsData) {
      await db
        .insert(degreeRequirements)
        .values({
          majorCode: requirement.majorCode,
          categoryName: requirement.categoryName,
          minCredits: requirement.minCredits,
          maxCredits: requirement.maxCredits || null,
          minCourses: requirement.minCourses || null,
          maxCourses: requirement.maxCourses || null,
          applicableFromCohortYear:
            requirement.applicableFromCohortYear || null,
          applicableUntilCohortYear:
            requirement.applicableUntilCohortYear || null,
          notes: requirement.notes || null,
        })
        .onConflictDoNothing();
    }

    console.log("✅ Degree requirements seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding degree requirements:", error);
    throw error;
  }
}

/**
 * Seed course categorizations (which courses count for which requirements)
 */
async function seedCourseCategorizations(dataDirectory: string) {
  try {
    const categorizationsData = JSON.parse(
      fs.readFileSync(
        path.join(dataDirectory, "course-categorizations.json"),
        "utf8"
      )
    );

    for (const categorization of categorizationsData) {
      let mathTrackName = null;
      if (categorization.mathTrackName) {
        mathTrackName = categorization.mathTrackName;
      }
      let capstoneOptionName = null;
      if (categorization.capstoneOptionName) {
        capstoneOptionName = categorization.capstoneOptionName;
      }

      await db
        .insert(courseCategorization)
        .values({
          courseCode: categorization.courseCode,
          categoryName: categorization.categoryName,
          majorGroup: categorization.majorGroup || null,
          mathTrackName, // This is now the math track name (natural key)
          capstoneOptionName,
          isRequired: categorization.isRequired || false,
          isFlexible: categorization.isFlexible || false,
          recommendedYear: categorization.recommendedYear || null,
          recommendedSemester: categorization.recommendedSemester || null,
          applicableFromCohortYear:
            categorization.applicableFromCohortYear || null,
          applicableUntilCohortYear:
            categorization.applicableUntilCohortYear || null,
        })
        .onConflictDoNothing();
    }

    console.log("✅ Course categorizations seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding course categorizations:", error);
    throw error;
  }
}

/**
 * Seed course grade requirements for each major
 */
async function seedCourseGradeRequirements(dataDirectory: string) {
  try {
    const gradeRequirementsData = JSON.parse(
      fs.readFileSync(
        path.join(dataDirectory, "course-grade-requirements.json"),
        "utf8"
      )
    );

    for (const requirement of gradeRequirementsData as CourseGradeRequirementInput[]) {
      await db
        .insert(courseGradeRequirements)
        .values({
          majorCode: requirement.majorCode,
          courseCode: requirement.courseCode,
          minimumGrade: requirement.minimumGrade,
          applicableFromCohortYear:
            requirement.applicableFromCohortYear || null,
          applicableUntilCohortYear:
            requirement.applicableUntilCohortYear || null,
          description: requirement.description || null,
        })
        .onConflictDoNothing();
    }

    console.log("✅ Course grade requirements seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding course grade requirements:", error);
    throw error;
  }
}

/**
 * Helper function to derive course level from course code
 * @example MATH221 -> 200
 */
function deriveCourseLevel(courseCode: string): number {
  // Try to extract a 3-digit number from the course code
  const match = courseCode.match(/\d{3}/);
  if (match) {
    // Take the first digit and multiply by 100 (e.g., 115 -> 1 -> 100)
    return Math.floor(parseInt(match[0]) / 100) * 100;
  }

  // Try to extract a 2-digit number if no 3-digit number is found
  const match2 = courseCode.match(/\d{2}/);
  if (match2) {
    return Math.floor(parseInt(match2[0]) / 10) * 100;
  }

  // Default to 100 if no number can be extracted
  return 100;
}

/**
 * Helper function to derive department code from course code
 * @example CS212 -> CSIS, MATH221 -> CSIS, ECON100 -> BA
 */
function deriveDepartmentCode(courseCode: string): string {
  // Extract the alphabetic prefix from the course code
  const match = courseCode.match(/^[A-Z]+/);
  if (match) {
    const prefix = match[0];
    // Map prefixes to department codes
    const prefixMap: Record<string, string> = {
      CS: "CSIS",
      CSIS: "CSIS",
      IS: "CSIS",
      MATH: "CSIS",
      SYS: "CSIS",
      AI: "CSIS",
      MS: "CSIS",
      BUSA: "BA",
      ECON: "BA",
      ENGR: "ENG",
      CE: "ENG",
      EE: "ENG",
      ME: "ENG",
      SC: "ENG",
      CHEM: "ENG",
      ENGL: "HSS",
      POLS: "HSS",
      SOAN: "HSS",
      FRENC: "HSS",
      AS: "HSS",
    };

    return prefixMap[prefix] || prefix;
  }

  // Default to MISC if no prefix can be extracted
  return "MISC";
}

// Export the main seeding function
export default seedCurriculum;

seedCurriculum().catch((error) => {
  console.error("Unhandled error in seeding process:", error);
  process.exit(1);
});
