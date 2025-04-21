// src/app/api/student/verify-mappings/route.ts
import { NextRequest, NextResponse } from "next/server";

import { and, eq } from "drizzle-orm";

import { db } from "@/drizzle";
import {
  studentSemesterMappings,
  transcriptVerifications,
} from "@/drizzle/schema";
import { auth } from "@/lib/auth/auth";
import { AppError } from "@/lib/errors/app-error-classes";

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized. You must be logged in." },
        { status: 401 }
      );
    }

    // Parse the request body
    const { mappings, studentId, token } = await request.json();

    // Validate request data
    if (!mappings || !studentId || !token) {
      return NextResponse.json(
        { error: "Missing required data for verification" },
        { status: 400 }
      );
    }

    // Verify token
    const verification = await db.query.transcriptVerifications.findFirst({
      where: and(
        eq(transcriptVerifications.verificationToken, token),
        eq(transcriptVerifications.status, "pending")
      ),
    });

    if (!verification) {
      return NextResponse.json(
        { error: "Invalid or expired verification token" },
        { status: 400 }
      );
    }

    // Process verification in transaction
    return await db.transaction(async (tx) => {
      try {
        // Update mappings
        const updatedMappingIds = [];

        for (const mapping of mappings) {
          // Skip mappings without academicSemesterId
          if (!mapping.academicSemesterId) {
            console.warn(
              `Skipping mapping for ${mapping.camuSemesterName} - missing academicSemesterId`
            );
            continue;
          }

          // Find the semester mapping record
          const semesterMapping =
            await tx.query.studentSemesterMappings.findFirst({
              where: and(
                eq(studentSemesterMappings.studentId, studentId),
                eq(
                  studentSemesterMappings.academicSemesterId,
                  mapping.academicSemesterId
                )
              ),
            });

          if (semesterMapping) {
            // Update the mapping
            await tx
              .update(studentSemesterMappings)
              .set({
                programYear: mapping.programYear,
                programSemester: mapping.isSummer
                  ? null
                  : mapping.programSemester,
                isSummer: mapping.isSummer,
                isVerified: true,
              })
              .where(eq(studentSemesterMappings.id, semesterMapping.id));

            updatedMappingIds.push(semesterMapping.id);
          }
        }
        // Update verification record
        await tx
          .update(transcriptVerifications)
          .set({
            status: "approved",
            verifiedAt: new Date(),
            updatedMappings: mappings,
          })
          .where(eq(transcriptVerifications.id, verification.id));

        return NextResponse.json({
          success: true,
          message: "Semester mappings verified successfully",
          updatedMappingIds,
        });
      } catch (error) {
        console.error("Error updating semester mappings:", error);

        throw error; // Will trigger rollback
      }
    });
  } catch (error) {
    // Convert error to AppError for consistent formatting
    const appError =
      error instanceof AppError
        ? error
        : new AppError({
            message:
              error instanceof Error
                ? error.message
                : "Failed to verify mappings",
            code: "VERIFICATION_ERROR",
            source: "server",
            originalError: error,
          });

    console.error("Verification error:", appError);

    // Return error response
    return NextResponse.json(
      {
        success: false,
        error: appError.message,
        details: appError.details,
        code: appError.code,
      },
      { status: (appError.status as number) || 500 }
    );
  }
}
