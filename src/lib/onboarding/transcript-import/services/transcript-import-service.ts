// src/lib/services/transcript-import-service.ts
import { and, eq } from "drizzle-orm";

import { db } from "@/drizzle";
import {
  academicSemesters,
  academicYears,
  authUsers,
  courseCodeHistory,
  courses,
  studentCourses,
  studentProfiles,
  studentSemesterMappings,
  transcriptImports,
  transcriptProcessingSteps,
  transcriptVerifications,
} from "@/drizzle/schema";
import { AppError } from "@/lib/errors/app-error-classes";
import { determineCapstoneOption } from "@/lib/onboarding/transcript-import/services/capstone-option-service";
import { determineCategoryForCourse } from "@/lib/onboarding/transcript-import/services/course-categorization-service";
import { calculateCourseStatistics } from "@/lib/onboarding/transcript-import/services/credit-calculation-service";
import { determineMathTrack } from "@/lib/onboarding/transcript-import/services/math-track-service";
import {
  extractSemesterNumber,
  isSummerSemester,
  processSemesterMappings,
} from "@/lib/onboarding/transcript-import/services/semester-mapping-service";
import { generateVerificationToken } from "@/lib/onboarding/transcript-import/token-verification-util";
import {
  CourseWithCategory,
  SemesterMapping,
  StudentProfileData,
  TranscriptData,
  TranscriptImportRequest,
  TranscriptImportResult,
  TranscriptSemester,
} from "@/lib/onboarding/transcript-import/transcript-import-types";

function formatCourseCode(courseCode: string) {
  return courseCode.replace(/\s/g, ""); // Remove all whitespace
}

// Add new utility function to map major names to codes
function mapMajorNameToCode(majorName: string): string {
  // Map full major names to codes as used in the majors table
  const majorMap: Record<string, string> = {
    "Computer Science": "CS",
    "Business Administration": "BA",
    "Management Information Systems": "MIS",
    "Computer Engineering": "CE",
    "Electrical and Electronic Engineering": "EE",
    "Mechanical Engineering": "ME",
    // Add more mappings as needed
  };
  const codes = ["CS", "BA", "MIS", "CE", "EE", "ME"];

  if (codes.includes(majorName)) {
    return majorName;
  }

  // Try to find a direct match
  if (majorMap[majorName]) {
    return majorMap[majorName];
  }

  // Try partial matches
  for (const [fullName, code] of Object.entries(majorMap)) {
    if (majorName.includes(fullName)) {
      return code;
    } else if (majorName.includes(code)) {
    }
  }

  // Default fallback
  console.warn(`No major code mapping found for "${majorName}", using default`);
  return "CS"; // Default to Computer Science if no match
}

// TODO: Remove the status (and hence the need to insert it) from the student_courses table since it's handled in the student_course_status_view

// TODO: Perhaps use the student_course_status_view since it has plenty of useful stuff

// TODO: Find and insert the student's capstone option. If none is found, the default of "Applied Project" should be placed. The student will be told about their capstone option upon import verification and they can change their capstone option there iff it was the default applied and not gotten from their taken courses.

// Create a service singleton that we can import
export const transcriptImportService = {
  /**
   * Main method to process a transcript import request with transaction and upsert capability
   */
  async importTranscript(
    importRequest: TranscriptImportRequest,
    mappings: SemesterMapping[]
  ): Promise<TranscriptImportResult> {
    return db.transaction(async (tx) => {
      try {
        const { transcriptData, academicInfo, programInfo, authId } =
          importRequest;

        // Ensure authId is available
        if (!authId) {
          throw new AppError({
            message: "Authentication ID is required for import",
            code: "MISSING_AUTH_ID",
            status: 400,
          });
        }

        // Extract student profile data with improved math track detection and credit calculation
        const studentProfile = await this.extractStudentProfile(
          transcriptData,
          academicInfo,
          programInfo,
          tx
        );

        // Update user's name if different
        await this.updateUserName(authId, studentProfile.name, tx);

        // Create/update student profile
        const studentRecord = await this.upsertStudentProfile(
          studentProfile,
          authId,
          tx
        );

        // NEW: Check for previous imports for this student
        const previousImports = await tx.query.transcriptImports.findMany({
          where: eq(transcriptImports.studentId, studentRecord.studentId),
          orderBy: (imports, { desc }) => [desc(imports.createdAt)],
        });

        const hasPreviousImports = previousImports.length > 0;
        console.log(
          `Student has previous imports: ${hasPreviousImports ? "Yes" : "No"}`
        );

        // NEW: Get existing semester mappings for this student
        const existingSemesterMappings =
          await tx.query.studentSemesterMappings.findMany({
            where: eq(
              studentSemesterMappings.studentId,
              studentRecord.studentId
            ),
          });

        console.log(
          `Found ${existingSemesterMappings.length} existing semester mappings`
        );

        // Create academic years and semesters - these can be reused across imports
        const academicPeriodsMap = await this.createAcademicPeriods(
          mappings,
          tx
        );

        // Create new transcript import record for this import session
        const importRecord = await this.createImportRecord(
          studentRecord.studentId,
          transcriptData,
          mappings,
          tx
        );

        // NEW: Determine which semesters need to be created vs updated
        const mappingResults = await this.upsertSemesterMappings(
          studentRecord.studentId,
          authId,
          mappings,
          academicPeriodsMap,
          existingSemesterMappings,
          tx
        );

        // Record processing step
        await this.recordProcessingStep(
          importRecord.id,
          "semester_mapping",
          "completed",
          {
            mappingCount: mappings.length,
            newCount: mappingResults.created,
            updatedCount: mappingResults.updated,
          },
          tx
        );

        // Get major code for course processing
        const majorCode = mapMajorNameToCode(programInfo.major);
        console.log(`\n\n\nExtracted major code: ${majorCode}\n\n\n`);

        // NEW: Get existing courses for this student
        const existingCourses = await tx.query.studentCourses.findMany({
          where: eq(studentCourses.studentId, studentRecord.studentId),
        });

        console.log(`Found ${existingCourses.length} existing courses`);

        // Process courses with upsert logic
        const courseResults = await this.upsertCourses(
          transcriptData,
          mappings,
          academicPeriodsMap,
          studentRecord.studentId,
          studentRecord.authId,
          majorCode,
          existingCourses,
          tx
        );

        // Record course processing step
        await this.recordProcessingStep(
          importRecord.id,
          "categorization",
          "completed",
          {
            courseCount: courseResults.total,
            newCount: courseResults.created,
            updatedCount: courseResults.updated,
          },
          tx
        );

        // Determine if verification is needed
        const requiresVerification = this.shouldRequireVerification(mappings);

        // Generate verification token if needed
        let verificationToken: string | undefined = undefined;
        if (requiresVerification) {
          verificationToken = generateVerificationToken();

          // Store verification token
          await this.storeVerificationToken(
            importRecord.id,
            verificationToken,
            mappings,
            tx
          );
        }

        // Update import record with results
        await tx
          .update(transcriptImports)
          .set({
            importStatus: requiresVerification
              ? "awaiting_verification"
              : "success",
            verificationStatus: requiresVerification
              ? "pending"
              : "not_required",
            requiresVerification,
            processedCoursesCount: courseResults.total,
            successfullyImportedCount: courseResults.total,
            newSemestersCount: mappingResults.created,
            updatedSemestersCount: mappingResults.updated,
            newCoursesCount: courseResults.created,
            updatedCoursesCount: courseResults.updated,
            isUpdate: hasPreviousImports,
          })
          .where(eq(transcriptImports.id, importRecord.id));

        return {
          success: true,
          studentId: studentRecord.studentId,
          processingId: importRecord.id,
          mappings,
          studentProfile,
          requiresVerification,
          importedCoursesCount: courseResults.total,
          verificationToken,
          isUpdate: hasPreviousImports,
          stats: {
            newSemesters: mappingResults.created,
            updatedSemesters: mappingResults.updated,
            newCourses: courseResults.created,
            updatedCourses: courseResults.updated,
          },
        };
      } catch (error) {
        console.error("Error during transcript import:", error);

        // Error will trigger transaction rollback
        if (error instanceof AppError) {
          throw error;
        }

        throw new AppError({
          message:
            error instanceof Error
              ? error.message
              : "Failed to import transcript",
          code: "TRANSCRIPT_IMPORT_ERROR",
          source: "database",
          originalError: error,
        });
      }
    });
  },

  // UPDATED: Extract student profile with math track detection and credit calculation
  /**
   * Extract and enhance student profile data from transcript
   * Includes calculation of credits passed/taken and courses passed/total
   */
  async extractStudentProfile(
    transcriptData: TranscriptData,
    academicInfo: any,
    programInfo: any,
    tx: any
  ): Promise<StudentProfileData> {
    const studentInfo = transcriptData.studentInfo;

    // Extract student ID - use student_roll_no from CAMU
    const studentId = studentInfo.student_roll_no;

    // Extract name
    const name = studentInfo.name;

    // Extract major from degree
    let major = this.extractMajorFromDegree(studentInfo.degree);

    // If we couldn't extract the major from degree, use programInfo
    if (major === "Unknown Major" && programInfo?.major) {
      major = programInfo.major;
    }

    // Get major code for credit calculation
    const majorCode = mapMajorNameToCode(major);
    console.log(`\n\n\nExtracted major code: ${majorCode}\n\n\n`);

    // Get all courses from all semesters for analysis
    const allCourses = transcriptData.semesters.flatMap(
      (semester) => semester.courses
    );

    // Determine math track based on courses taken
    const mathTrackName = determineMathTrack(allCourses, majorCode);
    const capstoneOptionName = determineCapstoneOption(allCourses, majorCode);

    // Get latest CGPA if available
    let cumulativeGpa = undefined;
    if (transcriptData.semesters.length > 0) {
      const lastSemester =
        transcriptData.semesters[transcriptData.semesters.length - 1];
      cumulativeGpa = lastSemester.gpaInfo.cgpa;
    }

    // Calculate detailed credits and course statistics
    let creditStats = {
      creditsPassed: 0,
      creditsTaken: 0,
      coursesPassed: 0,
      coursesTotal: 0,
    };

    try {
      creditStats = await calculateCourseStatistics(allCourses, majorCode, tx);
    } catch (error) {
      console.error("Error calculating credit statistics:", error);

      // Fallback: just count raw totals if calculation fails
      creditStats.creditsTaken = allCourses.reduce(
        (sum, course) => sum + (Number(course.credits) || 0),
        0
      );
      creditStats.coursesTotal = allCourses.length;
    }

    // Extract date of admission
    const dateOfAdmission = studentInfo.date_of_admission;

    // Get year group from academic info
    const yearGroup = academicInfo?.yearGroup;

    // Get current year and semester
    const currentYear = parseInt(academicInfo?.currentYear || "1");
    const currentSemester =
      academicInfo?.currentSemester === "Fall"
        ? 1
        : academicInfo?.currentSemester === "Spring"
          ? 2
          : 3;

    return {
      studentId,
      name,
      major,
      mathTrackName,
      capstoneOptionName,
      cumulativeGpa,
      creditsPassed: creditStats.creditsPassed,
      creditsTaken: creditStats.creditsTaken,
      coursesPassed: creditStats.coursesPassed,
      coursesTotal: creditStats.coursesTotal,
      dateOfAdmission,
      yearGroup,
      currentYear,
      currentSemester,
      isVerified: true,
    };
  },

  // Helper function to extract major from degree
  extractMajorFromDegree(degree: string): string {
    // Handle format like "B.Sc - Computer Science"
    const parts = degree.split(" - ");
    if (parts.length >= 2) {
      return parts[1].trim();
    }

    // Handle other formats
    if (degree.includes("Computer Science")) return "Computer Science";
    if (degree.includes("Business Admin")) return "Business Administration";
    if (degree.includes("MIS")) return "Management Information Systems";
    if (degree.includes("Computer Engineering")) return "Computer Engineering";
    if (degree.includes("Electrical and Electronic Engineering"))
      return "Electrical and Electronic Engineering";
    if (degree.includes("Mechanical Engineering"))
      return "Mechanical Engineering";

    return "Unknown Major";
  },

  shouldRequireVerification(mappings: SemesterMapping[]): boolean {
    // Check for semester 3 that's not marked as summer
    const hasSemester3NotSummer = mappings.some((m) => {
      const semNumber = extractSemesterNumber(m.camuSemesterName);
      return semNumber === 3 && !m.isSummer;
    });

    // Check for inconsistent program year/semester sequencing
    let lastProgramYear = 0;
    let lastProgramSemester = 0;
    let hasSequencingIssue = false;

    mappings.forEach((m) => {
      if (m.isSummer) return; // Skip summer semesters for sequence check

      // Check sequence progression
      if (
        m.programYear < lastProgramYear ||
        (m.programYear === lastProgramYear &&
          m.programSemester <= lastProgramSemester)
      ) {
        hasSequencingIssue = true;
      }

      lastProgramYear = m.programYear;
      lastProgramSemester = m.programSemester;
    });

    return hasSemester3NotSummer || hasSequencingIssue;
  },

  // Methods that need a transaction
  async updateUserName(authId: string, name: string, tx: any) {
    // Update the name in authUsers table if it exists
    if (name) {
      await tx.update(authUsers).set({ name }).where(eq(authUsers.id, authId));
    }
  },

  async upsertStudentProfile(
    profile: StudentProfileData,
    authId: string,
    tx: any
  ) {
    try {
      // Convert full major name to major code
      const majorCode = mapMajorNameToCode(profile.major);
      console.log(`\n\n\nExtracted major code: ${majorCode}\n\n\n`);

      console.log(
        `Mapped major name "${profile.major}" to code "${majorCode}"`
      );

      // First check if a profile with this authId already exists
      const existingProfileByAuth = await tx.query.studentProfiles.findFirst({
        where: eq(studentProfiles.authId, authId),
      });

      if (existingProfileByAuth) {
        // Update existing profile with new data from transcript
        await tx
          .update(studentProfiles)
          .set({
            studentId: profile.studentId, // Update studentId from transcript
            majorCode: majorCode, // Use the mapped code
            mathTrackName: profile.mathTrackName,
            capstoneOptionName: profile.capstoneOptionName,
            cumulativeGpa: profile.cumulativeGpa,
            cohortYear: profile.yearGroup
              ? parseInt(profile.yearGroup)
              : undefined,
            currentYear: profile.currentYear,
            currentSemester: profile.currentSemester?.toString(),
          })
          .where(eq(studentProfiles.authId, authId));

        // Return updated profile data
        return {
          ...existingProfileByAuth,
          studentId: profile.studentId,
        };
      }

      // Then check if a profile with this studentId already exists
      const existingProfileByStudentId =
        await tx.query.studentProfiles.findFirst({
          where: eq(studentProfiles.studentId, profile.studentId),
        });

      if (existingProfileByStudentId) {
        // If the profile exists but has a different authId, we need to handle it
        console.log(
          `Student ID ${profile.studentId} already exists with different auth ID, updating...`
        );

        // Update existing profile with new authId and data
        await tx
          .update(studentProfiles)
          .set({
            authId, // Link to current user
            majorCode: majorCode, // Use the mapped code
            mathTrackName: profile.mathTrackName,
            cumulativeGpa: profile.cumulativeGpa,
            cohortYear: profile.yearGroup
              ? parseInt(profile.yearGroup)
              : undefined,
            currentYear: profile.currentYear,
            currentSemester: profile.currentSemester?.toString(),
          })
          .where(eq(studentProfiles.studentId, profile.studentId));

        return existingProfileByStudentId;
      } else {
        // Create new profile if neither exists
        const newProfiles = await tx
          .insert(studentProfiles)
          .values({
            studentId: profile.studentId,
            authId,
            majorCode: majorCode, // Use the mapped code
            mathTrackName: profile.mathTrackName,
            cumulativeGpa: profile.cumulativeGpa,
            cohortYear: profile.yearGroup
              ? parseInt(profile.yearGroup)
              : undefined,
            currentYear: profile.currentYear,
            currentSemester: profile.currentSemester?.toString(),
          })
          .returning();

        return newProfiles[0];
      }
    } catch (error) {
      console.error("Error in upsertStudentProfile:", error);
      throw error;
    }
  },

  async createAcademicPeriods(
    mappings: SemesterMapping[],
    tx: any
  ): Promise<Map<string, string>> {
    const semesterMap = new Map<string, string>();

    for (const mapping of mappings) {
      const yearRange = mapping.academicYearRange;

      // Check if academic year exists
      let academicYear = await tx.query.academicYears.findFirst({
        where: eq(academicYears.yearName, yearRange),
      });

      if (!academicYear) {
        // Create academic year
        const [startYear, endYear] = yearRange.split("-").map(Number);

        const yearInsert = await tx
          .insert(academicYears)
          .values({
            yearName: yearRange,
            startDate: new Date(`${startYear}-08-01`),
            endDate: new Date(`${endYear}-07-31`),
            isCurrent: false,
          })
          .returning();

        academicYear = yearInsert[0];
      }

      // Check if semester exists
      let semester = await tx.query.academicSemesters.findFirst({
        where: and(
          eq(academicSemesters.academicYearName, yearRange),
          eq(academicSemesters.name, mapping.camuSemesterName)
        ),
      });

      if (!semester) {
        // Determine dates based on semester info
        const [startYear, endYear] = yearRange.split("-").map(Number);
        let startDate, endDate;

        const semNumber = extractSemesterNumber(mapping.camuSemesterName);

        if (semNumber === 1) {
          // Fall semester: Aug-Dec
          startDate = new Date(`${startYear}-08-15`);
          endDate = new Date(`${startYear}-12-15`);
        } else if (semNumber === 2) {
          // Spring semester: Jan-May
          startDate = new Date(`${endYear}-01-15`);
          endDate = new Date(`${endYear}-05-15`);
        } else if (mapping.isSummer) {
          // Summer semester: May-Aug
          startDate = new Date(`${endYear}-05-20`);
          endDate = new Date(`${endYear}-08-10`);
        } else {
          // Semester 3 (non-summer): Sep-Dec
          startDate = new Date(`${endYear}-09-01`);
          endDate = new Date(`${endYear}-12-20`);
        }

        // Create semester
        const semesterInsert = await tx
          .insert(academicSemesters)
          .values({
            academicYearName: yearRange,
            name: mapping.camuSemesterName,
            sequenceNumber: semNumber,
            startDate,
            endDate,
          })
          .returning();

        semester = semesterInsert[0];
      }

      // Add to mapping
      semesterMap.set(mapping.camuSemesterName, semester.id);
    }

    return semesterMap;
  },

  async createImportRecord(
    studentId: string,
    transcriptData: TranscriptData,
    mappings: SemesterMapping[],
    tx: any
  ) {
    // Extract and map the major name to code
    const majorName = this.extractMajorFromDegree(
      transcriptData.studentInfo.degree
    );

    console.log(`\n\n\nExtracted major name: ${majorName}\n\n\n`);
    const majorCode = mapMajorNameToCode(majorName);
    console.log(`\n\n\nExtracted major code: ${majorCode}\n\n\n`);

    // Create import record - REMOVE fileType and fileSize fields
    const importRecords = await tx
      .insert(transcriptImports)
      .values({
        studentId,
        fileName: "transcript-import",
        fileUrl: "n/a", // No physical file stored
        importStatus: "processing",
        semesterCount: mappings.length,
        extractedMajor: majorCode,
        importData: { semesters: transcriptData.semesters.map((s) => s.name) },
      })
      .returning();

    const importRecord = importRecords[0];

    // Record initial processing step
    await this.recordProcessingStep(
      importRecord.id,
      "extraction",
      "completed",
      { semesterCount: mappings.length },
      tx
    );

    return importRecord;
  },

  /**
   * NEW: Upsert semester mappings - update existing ones and create only new ones
   */
  async upsertSemesterMappings(
    studentId: string,
    authId: string,
    mappings: SemesterMapping[],
    academicPeriodsMap: Map<string, string>,
    existingMappings: any[],
    tx: any
  ): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;

    // Build a lookup map of existing mappings by semester ID
    const existingMappingsMap = new Map();
    existingMappings.forEach((mapping) => {
      existingMappingsMap.set(mapping.academicSemesterId, mapping);
    });

    for (const mapping of mappings) {
      const semesterId = academicPeriodsMap.get(mapping.camuSemesterName);

      if (!semesterId) {
        console.warn(`No semester ID found for ${mapping.camuSemesterName}`);
        continue;
      }

      // Update the mapping object with the semesterId for later use
      mapping.academicSemesterId = semesterId;

      // Check if mapping already exists
      const existingMapping = existingMappingsMap.get(semesterId);

      if (existingMapping) {
        // Update existing mapping if needed
        if (
          existingMapping.programYear !== mapping.programYear ||
          existingMapping.programSemester !==
            (mapping.isSummer ? null : mapping.programSemester) ||
          existingMapping.isSummer !== mapping.isSummer
        ) {
          await tx
            .update(studentSemesterMappings)
            .set({
              programYear: mapping.programYear,
              programSemester: mapping.isSummer
                ? null
                : mapping.programSemester,
              isSummer: mapping.isSummer,
              isVerified: true, // Always mark as verified on update
            })
            .where(eq(studentSemesterMappings.id, existingMapping.id));

          updated++;
        }
      } else {
        // Create new mapping
        const mappingRecords = await tx
          .insert(studentSemesterMappings)
          .values({
            studentId: studentId,
            authId: authId,
            academicSemesterId: semesterId,
            programYear: mapping.programYear,
            programSemester: mapping.isSummer ? null : mapping.programSemester,
            isSummer: mapping.isSummer,
            isVerified: !mapping.isSummer, // Summer semesters need verification
          })
          .returning();

        created++;
      }
    }

    return { created, updated };
  },

  /**
   * NEW: Upsert courses - update existing ones and create only new ones
   */
  async upsertCourses(
    transcriptData: TranscriptData,
    mappings: SemesterMapping[],
    academicPeriodsMap: Map<string, string>,
    studentId: string,
    authId: string,
    majorCode: string,
    existingCourses: any[],
    tx: any
  ): Promise<{ total: number; created: number; updated: number }> {
    let created = 0;
    let updated = 0;
    let total = 0;

    // Create a lookup map for existing courses by code and semester
    const existingCoursesMap = new Map();
    existingCourses.forEach((course) => {
      const key = `${course.courseCode !== null ? course.courseCode.toUpperCase() : null}|${course.semesterId}`;
      existingCoursesMap.set(key, course);
    });

    // Build a map of semester names to semester IDs
    const semesterIdMap = new Map();
    mappings.forEach((mapping) => {
      if (mapping.academicSemesterId) {
        semesterIdMap.set(mapping.camuSemesterName, mapping.academicSemesterId);
      }
    });

    // Process each semester
    for (const semester of transcriptData.semesters) {
      const semesterId = semesterIdMap.get(semester.name);

      if (!semesterId) {
        console.warn(`No semester ID found for ${semester.name}`);
        continue;
      }

      // Process each course in the semester
      for (const course of semester.courses) {
        const cleanCourseCode = formatCourseCode(course.code);

        // Resolve the course code
        let resolvedCourseCode = cleanCourseCode;
        let isPlaceholder = false;

        // 1. Check if code exists in courses
        const courseInCourses = await tx
          .select({ code: courses.code })
          .from(courses)
          .where(eq(courses.code, cleanCourseCode))
          .limit(1);

        if (courseInCourses.length === 0) {
          // 2. Check course_code_history
          const historicalCourse = await tx
            .select({ currentCode: courseCodeHistory.currentCode })
            .from(courseCodeHistory)
            .where(eq(courseCodeHistory.historicalCode, cleanCourseCode))
            .limit(1);

          if (historicalCourse.length > 0) {
            resolvedCourseCode = historicalCourse[0].currentCode;
          } else {
            // 3. Check by title in courses
            const courseByTitle = await tx
              .select({ code: courses.code })
              .from(courses)
              .where(eq(courses.title, course.title))
              .limit(1);

            if (courseByTitle.length > 0) {
              resolvedCourseCode = courseByTitle[0].code;
            } else {
              // No match found; treat as placeholder
              isPlaceholder = true;
            }
          }
        }

        // Determine category
        const category = await determineCategoryForCourse(
          resolvedCourseCode,
          majorCode,
          tx
        );

        // Build key for lookup (use resolved code)
        const courseKey = `${resolvedCourseCode.toUpperCase()}|${semesterId}`;

        // Check if course already exists
        const existingCourse = existingCoursesMap.get(courseKey);

        if (existingCourse) {
          // Update existing course if needed
          if (
            existingCourse.grade !== course.grade ||
            existingCourse.categoryName !== category ||
            existingCourse.status !== "planned" ||
            existingCourse.courseTitle !== course.title ||
            existingCourse.originalCourseCode !== cleanCourseCode
          ) {
            await tx
              .update(studentCourses)
              .set({
                grade: course.grade,
                categoryName: category,
                status: isPlaceholder ? "planned" : "imported",
                courseTitle: course.title,
                originalCourseCode:
                  cleanCourseCode !== resolvedCourseCode
                    ? cleanCourseCode
                    : null,
                courseCode: resolvedCourseCode,
              })
              .where(eq(studentCourses.id, existingCourse.id));

            updated++;
          }
        } else {
          // Create new course
          await tx.insert(studentCourses).values({
            authId: authId,
            studentId: studentId,
            courseCode: resolvedCourseCode,
            originalCourseCode:
              cleanCourseCode !== resolvedCourseCode ? cleanCourseCode : null,
            courseTitle: course.title,
            semesterId: semesterId,
            status: isPlaceholder ? "planned" : "imported",
            grade: course.grade,
            categoryName: category,
          });

          created++;
        }

        total++;

        // Handle retakes
        const otherSemesterCoursesWithSameCode = existingCourses.filter(
          (ec) =>
            ec.courseCode === resolvedCourseCode && ec.semesterId !== semesterId
        );
        // TODO: Handle multiple courses with same code (e.g., drop and re-import)
      }
    }

    return { total, created, updated };
  },

  async recordProcessingStep(
    importId: string,
    stepName: string,
    status: string,
    details: any,
    tx: any
  ) {
    const records = await tx
      .insert(transcriptProcessingSteps)
      .values({
        importId,
        stepName: stepName as any, // Type assertion to satisfy TypeScript
        status: status as any, // Type assertion to satisfy TypeScript
        startedAt: new Date(),
        completedAt: status === "completed" ? new Date() : null,
        details,
      })
      .returning();

    return records[0];
  },

  async storeVerificationToken(
    importId: string,
    token: string,
    originalMappings: SemesterMapping[],
    tx: any
  ) {
    const records = await tx
      .insert(transcriptVerifications)
      .values({
        importId,
        verificationToken: token,
        status: "pending",
        originalMappings,
      })
      .returning();

    return records[0];
  },

  // Generate updated semester mappings with the fixed algorithm
  async generateSemesterMappings(
    semesters: TranscriptSemester[],
    academicInfo: any,
    studentInfo: any
  ): Promise<SemesterMapping[]> {
    // Use the fixed semester mapping algorithm
    return processSemesterMappings(
      semesters,
      academicInfo,
      studentInfo.date_of_admission
    );
  },
};
