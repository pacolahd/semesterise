// src/lib/services/transcript-import-service.ts
import { and, eq } from "drizzle-orm";

import { db } from "@/drizzle";
import {
  academicSemesters,
  academicYears,
  authUsers,
  studentCourses,
  studentProfiles,
  studentSemesterMappings,
  transcriptImports,
  transcriptProcessingSteps,
  transcriptVerifications,
} from "@/drizzle/schema";
import { AppError } from "@/lib/errors/app-error-classes";
import { determineCategoryForCourse } from "@/lib/services/course-categorization-service";
import {
  extractSemesterNumber,
  isSummerSemester,
} from "@/lib/services/semester-mapping-service";
import {
  CourseWithCategory,
  SemesterMapping,
  StudentProfileData,
  TranscriptData,
  TranscriptImportRequest,
  TranscriptImportResult,
} from "@/lib/types/transcript";
import { generateVerificationToken } from "@/lib/utils/token-utils";

// Create a service singleton that we can import
export const transcriptImportService = {
  /**
   * Main method to process a transcript import request with transaction
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

        // Extract student profile data
        const studentProfile = this.extractStudentProfile(
          transcriptData,
          academicInfo,
          programInfo
        );

        // Update user's name if different
        await this.updateUserName(authId, studentProfile.name, tx);

        // Create/update student profile
        const studentRecord = await this.upsertStudentProfile(
          studentProfile,
          authId,
          tx
        );

        // Create academic years and semesters
        const academicPeriodsMap = await this.createAcademicPeriods(
          mappings,
          tx
        );

        // Create transcript import record
        const importRecord = await this.createImportRecord(
          studentRecord.studentId,
          transcriptData,
          mappings,
          tx
        );

        // Create semester mappings
        const mappingRecords = await this.createSemesterMappings(
          studentRecord.studentId,
          mappings,
          academicPeriodsMap,
          tx
        );

        // Record processing step
        await this.recordProcessingStep(
          importRecord.id,
          "semester_mapping",
          "completed",
          { mappingCount: mappingRecords.length },
          tx
        );

        // Process courses
        const courses = await this.processCourses(
          transcriptData,
          mappings,
          academicPeriodsMap,
          studentRecord.studentId,
          programInfo.major,
          tx
        );

        // Record course processing step
        await this.recordProcessingStep(
          importRecord.id,
          "categorization",
          "completed",
          { courseCount: courses.length },
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
            processedCoursesCount: courses.length,
            successfullyImportedCount: courses.length,
          })
          .where(eq(transcriptImports.id, importRecord.id));

        return {
          success: true,
          studentId: studentRecord.studentId,
          processingId: importRecord.id,
          mappings,
          studentProfile,
          requiresVerification,
          importedCoursesCount: courses.length,
          verificationToken,
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

  // Helper methods
  extractStudentProfile(
    transcriptData: TranscriptData,
    academicInfo: any,
    programInfo: any
  ): StudentProfileData {
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

    // Get latest CGPA if available
    let cumulativeGpa = undefined;
    if (transcriptData.semesters.length > 0) {
      const lastSemester =
        transcriptData.semesters[transcriptData.semesters.length - 1];
      cumulativeGpa = lastSemester.gpaInfo.cgpa;
    }

    // Extract credit hours from currentCredits field
    const creditHours = transcriptData.currentCredits;

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
      mathTrackName: programInfo?.mathTrack,
      cumulativeGpa,
      creditHours: creditHours ? parseFloat(creditHours) : undefined,
      dateOfAdmission,
      yearGroup,
      currentYear,
      currentSemester,
      isVerified: true,
    };
  },

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
    if (degree.includes("Electrical Engineering"))
      return "Electrical Engineering";
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
    // Check if student profile exists
    const existingProfile = await tx.query.studentProfiles.findFirst({
      where: eq(studentProfiles.studentId, profile.studentId),
    });

    if (existingProfile) {
      // Update existing profile with relevant fields
      await tx
        .update(studentProfiles)
        .set({
          majorCode: profile.major,
          mathTrackName: profile.mathTrackName,
          cumulativeGpa: profile.cumulativeGpa,
          cohortYear: profile.yearGroup
            ? parseInt(profile.yearGroup)
            : undefined,
          currentYear: profile.currentYear,
          currentSemester: profile.currentSemester?.toString(),
        })
        .where(eq(studentProfiles.studentId, profile.studentId));

      return existingProfile;
    } else {
      // Create new profile
      const newProfiles = await tx
        .insert(studentProfiles)
        .values({
          studentId: profile.studentId,
          authId,
          majorCode: profile.major,
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
    // Create import record
    const importRecords = await tx
      .insert(transcriptImports)
      .values({
        studentId,
        fileName: "transcript-import",
        fileUrl: "n/a", // No physical file stored
        importStatus: "processing",
        semesterCount: mappings.length,
        extractedMajor: this.extractMajorFromDegree(
          transcriptData.studentInfo.degree
        ),
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

  async createSemesterMappings(
    studentId: string,
    mappings: SemesterMapping[],
    academicPeriodsMap: Map<string, string>,
    tx: any
  ) {
    const createdMappings = [];

    for (const mapping of mappings) {
      const semesterId = academicPeriodsMap.get(mapping.camuSemesterName);

      if (!semesterId) {
        console.warn(`No semester ID found for ${mapping.camuSemesterName}`);
        continue;
      }

      // Create semester mapping
      const mappingRecords = await tx
        .insert(studentSemesterMappings)
        .values({
          student_id: studentId,
          academic_semester_id: semesterId,
          program_year: mapping.programYear,
          program_semester: mapping.isSummer ? null : mapping.programSemester,
          is_summer: mapping.isSummer,
          is_verified: !mapping.isSummer, // Only non-summer semesters are auto-verified
        })
        .returning();

      createdMappings.push(mappingRecords[0]);
    }

    return createdMappings;
  },

  async processCourses(
    transcriptData: TranscriptData,
    mappings: SemesterMapping[],
    academicPeriodsMap: Map<string, string>,
    studentId: string,
    majorCode: string,
    tx: any
  ) {
    const importedCourses = [];

    // Process each semester
    for (const semester of transcriptData.semesters) {
      const semesterId = academicPeriodsMap.get(semester.name);

      if (!semesterId) {
        console.warn(`No semester ID found for ${semester.name}`);
        continue;
      }

      // Process each course in the semester
      for (const course of semester.courses) {
        // Determine category
        const category = await determineCategoryForCourse(
          course.code,
          majorCode,
          tx
        );

        // Check if failing grade (E)
        const isFailed = course.grade === "E";

        // Check if this course has been taken before
        const existingCourse = await tx.query.studentCourses.findFirst({
          where: and(
            eq(studentCourses.student_id, studentId),
            eq(studentCourses.course_code, course.code)
          ),
        });

        // Create student course record
        const courseRecords = await tx
          .insert(studentCourses)
          .values({
            studentId,
            course_code: course.code,
            semester_id: semesterId,
            status: isFailed ? "failed" : "verified",
            grade: course.grade,
            category_name: category,
            is_verified: true,
            counts_for_gpa: course.grade !== "W", // 'W' (withdrawn) doesn't count for GPA
            is_used_for_requirement: !isFailed, // Failed courses don't count for requirements
          })
          .returning();

        importedCourses.push(courseRecords[0]);

        // If this is a retake, update the original course to not count for requirements
        if (existingCourse && !isFailed) {
          await tx
            .update(studentCourses)
            .set({
              is_used_for_requirement: false,
            })
            .where(eq(studentCourses.id, existingCourse.id));
        }
      }
    }

    return importedCourses;
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
};
