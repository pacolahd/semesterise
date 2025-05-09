"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { and, asc, desc, eq, inArray, like } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/drizzle";
import { authUsers } from "@/drizzle/schema/auth";
import { staffProfiles } from "@/drizzle/schema/institution/staff-profiles";
import {
  petitionCourseSchema,
  petitionCourses,
  petitionDocumentSchema,
  petitionDocuments,
  petitionMessageSchema,
  petitionMessages,
  petitionNotificationSchema,
  petitionNotifications,
  petitionParticipantSchema,
  petitionParticipants,
  petitionSchema,
  petitionTypes,
  petitionWorkflowStepSchema,
  petitionWorkflowSteps,
  petitions,
} from "@/drizzle/schema/petition-system";
import {
  ParticipantRole,
  PetitionStatus,
  participantRoleValues,
  petitionStatusValues,
} from "@/drizzle/schema/petition-system/enums";
import { PetitionCourseRecord } from "@/drizzle/schema/petition-system/petition-courses";
import { PetitionMessageInput } from "@/drizzle/schema/petition-system/petition-messages";
import { PetitionNotificationInput } from "@/drizzle/schema/petition-system/petition-notifications";
import { PetitionTypeRecord } from "@/drizzle/schema/petition-system/petition-types";
import { PetitionRecord } from "@/drizzle/schema/petition-system/petitions";
import { studentProfiles } from "@/drizzle/schema/student-records";
import { getSession } from "@/lib/auth/auth-actions";
import {
  AppError,
  AuthError,
  ValidationError,
} from "@/lib/errors/app-error-classes";
import { formatZodErrors, serializeError } from "@/lib/errors/error-converter";
import {
  notifyNewMessage,
  notifyPetitionStatusChange,
  sendNotification,
} from "@/lib/petition-system/notification-service";
import { ActionResponse } from "@/lib/types/common";

// src/lib/petition-system/petition-actions.ts

/**
 * Get a petition by ID
 */
export async function getPetitionById(
  id: string
): Promise<ActionResponse<PetitionRecord>> {
  try {
    const sessionResult = await getSession();
    if (!sessionResult.success || !sessionResult.data) {
      return {
        success: false,
        error:
          sessionResult.error || serializeError(new Error("No session data")),
      };
    }

    const { user } = sessionResult.data;

    const petition = await db.query.petitions.findFirst({
      where: eq(petitions.id, id),
      with: {
        petitionType: true,
        student: true,
        courses: {
          with: {
            course: true,
            targetSemester: true,
          },
        },
        documents: true,
        workflowSteps: {
          orderBy: [asc(petitionWorkflowSteps.orderIndex)],
        },
        participants: true,
        messages: {
          orderBy: [asc(petitionMessages.createdAt)],
          with: {
            user: {
              columns: {
                name: true,
                email: true,
                image: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!petition) {
      return {
        success: false,
        error: serializeError(
          new AppError({
            message: "Petition not found",
            code: "PETITION_NOT_FOUND",
          })
        ),
      };
    }

    const hasAccess = await checkPetitionAccess(id, user.id);
    if (!hasAccess) {
      return {
        success: false,
        error: serializeError(
          new AppError({
            message: "You don't have access to this petition",
            code: "UNAUTHORIZED",
          })
        ),
      };
    }

    await db
      .update(petitionParticipants)
      .set({
        lastViewedAt: new Date(),
      })
      .where(
        and(
          eq(petitionParticipants.petitionId, id),
          eq(petitionParticipants.userId, user.id)
        )
      );

    return {
      success: true,
      data: petition,
    };
  } catch (error) {
    console.error("Error fetching petition:", error);
    return {
      success: false,
      error: serializeError(error),
    };
  }
}

/**
 * Check if user has access to a petition
 */
async function checkPetitionAccess(
  petitionId: string,
  userId: string
): Promise<boolean> {
  const petition = await db.query.petitions.findFirst({
    where: eq(petitions.id, petitionId),
    with: {
      student: true,
      participants: true,
    },
  });

  if (!petition) return false;

  const isParticipant = petition.participants.some((p) => p.userId === userId);
  const isOwner = petition.student.authId === userId;

  return isParticipant || isOwner;
}

/**
 * Get petition messages
 */
export async function getPetitionMessages(
  petitionId: string
): Promise<
  ActionResponse<(typeof petitionMessages.$inferSelect & { user: any })[]>
> {
  try {
    const sessionResult = await getSession();
    if (!sessionResult.success || !sessionResult.data) {
      return {
        success: false,
        error:
          sessionResult.error || serializeError(new Error("No session data")),
      };
    }

    const { user } = sessionResult.data;

    const hasAccess = await checkPetitionAccess(petitionId, user.id);
    if (!hasAccess) {
      return {
        success: false,
        error: serializeError(
          new AppError({
            message: "You don't have access to this petition",
            code: "UNAUTHORIZED",
          })
        ),
      };
    }

    const isStudent = user.role === "student";
    let conditions = [eq(petitionMessages.petitionId, petitionId)];

    if (isStudent) {
      conditions.push(eq(petitionMessages.isAdminOnly, false));
    }

    const messages = await db.query.petitionMessages.findMany({
      where: and(...conditions),
      orderBy: [asc(petitionMessages.createdAt)],
      with: {
        user: {
          columns: {
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
      },
    });

    return {
      success: true,
      data: messages,
    };
  } catch (error) {
    console.error("Error fetching petition messages:", error);
    return {
      success: false,
      error: serializeError(error),
    };
  }
}

/**
 * Get user notifications
 */
export async function getUserNotifications(): Promise<
  ActionResponse<(typeof petitionNotifications.$inferSelect)[]>
> {
  try {
    const sessionResult = await getSession();
    if (!sessionResult.success || !sessionResult.data) {
      return {
        success: false,
        error:
          sessionResult.error || serializeError(new Error("No session data")),
      };
    }

    const { user } = sessionResult.data;

    const notifications = await db.query.petitionNotifications.findMany({
      where: eq(petitionNotifications.recipientUserId, user.id),
      orderBy: [desc(petitionNotifications.createdAt)],
      with: {
        petition: {
          columns: {
            referenceNumber: true,
            title: true,
          },
        },
      },
      limit: 50,
    });

    return {
      success: true,
      data: notifications,
    };
  } catch (error) {
    console.error("Error fetching user notifications:", error);
    return {
      success: false,
      error: serializeError(error),
    };
  }
}

/**
 * Generate a unique reference number for a new petition
 */
export async function generatePetitionReferenceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const month = (new Date().getMonth() + 1).toString().padStart(2, "0");
  const pattern = `P-${year}-${month}-%`;

  const latestPetition = await db.query.petitions.findFirst({
    where: like(petitions.referenceNumber, pattern),
    orderBy: [desc(petitions.referenceNumber)],
  });

  let sequence = 1;
  if (latestPetition) {
    const match = latestPetition.referenceNumber.match(/P-\d{4}-\d{2}-(\d+)/);
    if (match && match[1]) {
      sequence = parseInt(match[1]) + 1;
    }
  }

  return `P-${year}-${month}-${sequence.toString().padStart(4, "0")}`;
}

/**
 * Create a new petition draft
 */
export async function createPetitionDraft(
  input: z.infer<typeof petitionSchema>
): Promise<ActionResponse<{ id: string; referenceNumber: string }>> {
  try {
    const sessionResult = await getSession();
    if (!sessionResult.success || !sessionResult.data) {
      return {
        success: false,
        error:
          sessionResult.error || serializeError(new Error("No session data")),
      };
    }

    const { user } = sessionResult.data;

    const validationResult = petitionSchema.safeParse(input);
    if (!validationResult.success) {
      const validationError = new ValidationError(
        "Invalid petition data",
        formatZodErrors(validationResult.error)
      );

      return {
        success: false,
        error: validationError.serialize(),
      };
    }

    const studentProfile = await db.query.studentProfiles.findFirst({
      where: eq(studentProfiles.authId, user.id),
    });

    if (!studentProfile || !studentProfile.studentId) {
      return {
        success: false,
        error: serializeError(
          new AppError({
            message: "Student profile not found",
            code: "PROFILE_NOT_FOUND",
          })
        ),
      };
    }

    const referenceNumber = await generatePetitionReferenceNumber();

    const [petition] = await db
      .insert(petitions)
      .values({
        ...validationResult.data,
        referenceNumber,
        studentId: studentProfile.studentId,
        status: "draft",
      })
      .returning({
        id: petitions.id,
        referenceNumber: petitions.referenceNumber,
      });

    await db.insert(petitionParticipants).values({
      petitionId: petition.id,
      userId: user.id,
      role: "student",
      isNotified: true,
    });

    revalidatePath("/petitions");

    return {
      success: true,
      data: {
        id: petition.id,
        referenceNumber: petition.referenceNumber,
      },
    };
  } catch (error) {
    console.error("Error creating petition draft:", error);
    return {
      success: false,
      error: serializeError(error),
    };
  }
}

/**
 * Update an existing draft petition
 */
export async function updatePetitionDraft(
  id: string,
  input: Partial<z.infer<typeof petitionSchema>>
): Promise<ActionResponse<{ id: string }>> {
  try {
    const sessionResult = await getSession();
    if (!sessionResult.success || !sessionResult.data) {
      return {
        success: false,
        error:
          sessionResult.error || serializeError(new Error("No session data")),
      };
    }

    const { user } = sessionResult.data;

    const studentProfile = await db.query.studentProfiles.findFirst({
      where: eq(studentProfiles.authId, user.id),
    });

    if (!studentProfile || !studentProfile.studentId) {
      return {
        success: false,
        error: serializeError(
          new AppError({
            message: "Student profile not found",
            code: "PROFILE_NOT_FOUND",
          })
        ),
      };
    }

    const petitionRecord = await db.query.petitions.findFirst({
      where: and(
        eq(petitions.id, id),
        eq(petitions.studentId, studentProfile.studentId),
        eq(petitions.status, "draft")
      ),
    });

    if (!petitionRecord) {
      return {
        success: false,
        error: serializeError(
          new AppError({
            message: "Petition draft not found or not owned by you",
            code: "PETITION_NOT_FOUND",
          })
        ),
      };
    }

    await db
      .update(petitions)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(petitions.id, id));

    revalidatePath("/petitions");
    revalidatePath(`/petitions/${id}`);

    return {
      success: true,
      data: { id },
    };
  } catch (error) {
    console.error("Error updating petition draft:", error);
    return {
      success: false,
      error: serializeError(error),
    };
  }
}

/**
 * Add a course to a petition
 */
export async function addPetitionCourse(
  input: PetitionCourseRecord
): Promise<ActionResponse<{ id: string }>> {
  try {
    const sessionResult = await getSession();
    if (!sessionResult.success || !sessionResult.data) {
      return {
        success: false,
        error:
          sessionResult.error || serializeError(new Error("No session data")),
      };
    }

    const { user } = sessionResult.data;

    const validationResult = petitionCourseSchema.safeParse(input);
    if (!validationResult.success) {
      const validationError = new ValidationError(
        "Invalid petition course data",
        formatZodErrors(validationResult.error)
      );

      return {
        success: false,
        error: validationError.serialize(),
      };
    }

    const studentProfile = await db.query.studentProfiles.findFirst({
      where: eq(studentProfiles.authId, user.id),
    });

    if (!studentProfile || !studentProfile.studentId) {
      return {
        success: false,
        error: serializeError(
          new AppError({
            message: "Student profile not found",
            code: "PROFILE_NOT_FOUND",
          })
        ),
      };
    }

    const petitionRecord = await db.query.petitions.findFirst({
      where: and(
        eq(petitions.id, input.petitionId),
        eq(petitions.studentId, studentProfile.studentId),
        eq(petitions.status, "draft")
      ),
    });

    if (!petitionRecord) {
      return {
        success: false,
        error: serializeError(
          new AppError({
            message: "Petition draft not found or not owned by you",
            code: "PETITION_NOT_FOUND",
          })
        ),
      };
    }

    const existingCourse = await db.query.petitionCourses.findFirst({
      where: and(
        eq(petitionCourses.petitionId, input.petitionId),
        eq(petitionCourses.courseCode, input.courseCode)
      ),
    });

    if (existingCourse) {
      return {
        success: false,
        error: serializeError(
          new AppError({
            message: "This course is already included in the petition",
            code: "COURSE_ALREADY_EXISTS",
          })
        ),
      };
    }

    const [course] = await db
      .insert(petitionCourses)
      .values(validationResult.data)
      .returning({ id: petitionCourses.id });

    revalidatePath(`/petitions/${input.petitionId}`);

    return {
      success: true,
      data: { id: course.id },
    };
  } catch (error) {
    console.error("Error adding petition course:", error);
    return {
      success: false,
      error: serializeError(error),
    };
  }
}

/**
 * Remove a course from a petition
 */
export async function removePetitionCourse(
  courseId: string
): Promise<ActionResponse<boolean>> {
  try {
    const sessionResult = await getSession();
    if (!sessionResult.success || !sessionResult.data) {
      return {
        success: false,
        error:
          sessionResult.error || serializeError(new Error("No session data")),
      };
    }

    const { user } = sessionResult.data;

    const studentProfile = await db.query.studentProfiles.findFirst({
      where: eq(studentProfiles.authId, user.id),
    });

    if (!studentProfile || !studentProfile.studentId) {
      return {
        success: false,
        error: serializeError(
          new AppError({
            message: "Student profile not found",
            code: "PROFILE_NOT_FOUND",
          })
        ),
      };
    }

    const course = await db.query.petitionCourses.findFirst({
      where: eq(petitionCourses.id, courseId),
      with: {
        petition: true,
      },
    });

    if (!course) {
      return {
        success: false,
        error: serializeError(
          new AppError({
            message: "Course not found in petition",
            code: "COURSE_NOT_FOUND",
          })
        ),
      };
    }

    if (
      course.petition.studentId !== studentProfile.studentId ||
      course.petition.status !== "draft"
    ) {
      return {
        success: false,
        error: serializeError(
          new AppError({
            message: "Cannot remove course - petition is not your draft",
            code: "UNAUTHORIZED",
          })
        ),
      };
    }

    await db.delete(petitionCourses).where(eq(petitionCourses.id, courseId));

    revalidatePath(`/petitions/${course.petitionId}`);

    return {
      success: true,
      data: true,
    };
  } catch (error) {
    console.error("Error removing petition course:", error);
    return {
      success: false,
      error: serializeError(error),
    };
  }
}

/**
 * Add a document to a petition
 */
export async function addPetitionDocument(
  input: z.infer<typeof petitionDocumentSchema>
): Promise<ActionResponse<{ id: string }>> {
  try {
    const sessionResult = await getSession();
    if (!sessionResult.success || !sessionResult.data) {
      return {
        success: false,
        error:
          sessionResult.error || serializeError(new Error("No session data")),
      };
    }

    const { user } = sessionResult.data;

    const validationResult = petitionDocumentSchema.safeParse(input);
    if (!validationResult.success) {
      const validationError = new ValidationError(
        "Invalid document data",
        formatZodErrors(validationResult.error)
      );

      return {
        success: false,
        error: validationError.serialize(),
      };
    }

    const petitionRecord = await db.query.petitions.findFirst({
      where: eq(petitions.id, input.petitionId),
      with: {
        participants: true,
      },
    });

    if (!petitionRecord) {
      return {
        success: false,
        error: serializeError(
          new AppError({
            message: "Petition not found",
            code: "PETITION_NOT_FOUND",
          })
        ),
      };
    }

    const studentProfile = await db.query.studentProfiles.findFirst({
      where: eq(studentProfiles.authId, user.id),
    });

    const isParticipant = petitionRecord.participants.some(
      (p) => p.userId === user.id
    );

    const isOwner = studentProfile?.studentId === petitionRecord.studentId;

    if (!isParticipant && !isOwner) {
      return {
        success: false,
        error: serializeError(
          new AppError({
            message:
              "You don't have permission to add documents to this petition",
            code: "UNAUTHORIZED",
          })
        ),
      };
    }

    const [document] = await db
      .insert(petitionDocuments)
      .values({
        ...validationResult.data,
        uploadedBy: user.id,
      })
      .returning({ id: petitionDocuments.id });

    revalidatePath(`/petitions/${input.petitionId}`);

    return {
      success: true,
      data: { id: document.id },
    };
  } catch (error) {
    console.error("Error adding petition document:", error);
    return {
      success: false,
      error: serializeError(error),
    };
  }
}

/**
 * Delete a document from a petition
 */
export async function deletePetitionDocument(
  documentId: string
): Promise<ActionResponse<boolean>> {
  try {
    const sessionResult = await getSession();
    if (!sessionResult.success || !sessionResult.data) {
      return {
        success: false,
        error:
          sessionResult.error || serializeError(new Error("No session data")),
      };
    }

    const { user } = sessionResult.data;

    const document = await db.query.petitionDocuments.findFirst({
      where: eq(petitionDocuments.id, documentId),
      with: {
        petition: true,
      },
    });

    if (!document) {
      return {
        success: false,
        error: serializeError(
          new AppError({
            message: "Document not found",
            code: "DOCUMENT_NOT_FOUND",
          })
        ),
      };
    }

    const studentProfile = await db.query.studentProfiles.findFirst({
      where: eq(studentProfiles.authId, user.id),
    });

    const isUploader = document.uploadedBy === user.id;
    const isOwner = studentProfile?.studentId === document.petition.studentId;

    if (!isUploader && !isOwner) {
      return {
        success: false,
        error: serializeError(
          new AppError({
            message: "You don't have permission to delete this document",
            code: "UNAUTHORIZED",
          })
        ),
      };
    }

    if (document.petition.status !== "draft") {
      return {
        success: false,
        error: serializeError(
          new AppError({
            message: "Cannot delete document from submitted petition",
            code: "INVALID_OPERATION",
          })
        ),
      };
    }

    await db
      .delete(petitionDocuments)
      .where(eq(petitionDocuments.id, documentId));

    try {
      await fetch(`/api/uploadthing?fileKey=${document.fileKey}`, {
        method: "DELETE",
      });
    } catch (deleteError) {
      console.error("Failed to delete file from storage:", deleteError);
    }

    revalidatePath(`/petitions/${document.petitionId}`);

    return {
      success: true,
      data: true,
    };
  } catch (error) {
    console.error("Error deleting petition document:", error);
    return {
      success: false,
      error: serializeError(error),
    };
  }
}

/**
 * Initialize the workflow steps for a petition
 */
export async function initializePetitionWorkflow(
  petitionId: string
): Promise<ActionResponse<boolean>> {
  try {
    const sessionResult = await getSession();
    if (!sessionResult.success || !sessionResult.data) {
      return {
        success: false,
        error:
          sessionResult.error || serializeError(new Error("No session data")),
      };
    }

    const { user } = sessionResult.data;

    const studentProfile = await db.query.studentProfiles.findFirst({
      where: eq(studentProfiles.authId, user.id),
    });

    if (!studentProfile || !studentProfile.studentId) {
      return {
        success: false,
        error: serializeError(
          new AppError({
            message: "Student profile not found",
            code: "PROFILE_NOT_FOUND",
          })
        ),
      };
    }

    const petition = await db.query.petitions.findFirst({
      where: and(
        eq(petitions.id, petitionId),
        eq(petitions.studentId, studentProfile.studentId),
        eq(petitions.status, "draft")
      ),
      with: {
        petitionType: true,
      },
    });

    if (!petition) {
      return {
        success: false,
        error: serializeError(
          new AppError({
            message: "Draft petition not found or not owned by you",
            code: "PETITION_NOT_FOUND",
          })
        ),
      };
    }

    const workflowSteps = [
      { role: "academic_advisor", isMandatory: true },
      { role: "hod", isMandatory: true },
      { role: "provost", isMandatory: true },
      { role: "registry", isMandatory: true },
    ];

    await db.transaction(async (tx) => {
      for (let i = 0; i < workflowSteps.length; i++) {
        const step = workflowSteps[i];
        await tx.insert(petitionWorkflowSteps).values({
          petitionId,
          role: step.role as ParticipantRole,
          orderIndex: i,
          isMandatory: step.isMandatory,
          isCurrent: i === 0,
          status: i === 0 ? "pending" : null,
        });
      }

      await tx
        .update(petitions)
        .set({
          status: "submitted",
          updatedAt: new Date(),
        })
        .where(eq(petitions.id, petitionId));
    });

    await addDefaultParticipants(petitionId);

    revalidatePath("/petitions");
    revalidatePath(`/petitions/${petitionId}`);

    return {
      success: true,
      data: true,
    };
  } catch (error) {
    console.error("Error initializing petition workflow:", error);
    return {
      success: false,
      error: serializeError(error),
    };
  }
}

/**
 * Helper function to add default participants to a petition
 */
async function addDefaultParticipants(petitionId: string): Promise<void> {
  const petition = await db.query.petitions.findFirst({
    where: eq(petitions.id, petitionId),
    with: {
      student: true,
    },
  });

  if (!petition) return;

  const academicAdvisor = await db.query.authUsers.findFirst({
    where: eq(authUsers.role, "academic_advisor"),
  });

  const hod = await db.query.authUsers.findFirst({
    where: eq(authUsers.role, "hod"),
  });

  const provost = await db.query.authUsers.findFirst({
    where: eq(authUsers.role, "provost"),
  });

  const registry = await db.query.authUsers.findFirst({
    where: eq(authUsers.role, "registry"),
  });

  await db.transaction(async (tx) => {
    const studentUser = await tx.query.authUsers.findFirst({
      where: eq(authUsers.id, petition.student.authId),
    });

    if (academicAdvisor) {
      await tx.insert(petitionParticipants).values({
        petitionId,
        userId: academicAdvisor.id,
        role: "academic_advisor",
        isNotified: true,
      });

      await sendNotification(
        academicAdvisor.id,
        petitionId,
        "new_petition",
        `New petition ${petition.referenceNumber} requires your review`,
        tx
      );
    }

    if (hod) {
      await tx.insert(petitionParticipants).values({
        petitionId,
        userId: hod.id,
        role: "hod",
        isNotified: false,
      });
    }

    if (provost) {
      await tx.insert(petitionParticipants).values({
        petitionId,
        userId: provost.id,
        role: "provost",
        isNotified: false,
      });
    }

    if (registry) {
      await tx.insert(petitionParticipants).values({
        petitionId,
        userId: registry.id,
        role: "registry",
        isNotified: false,
      });
    }
  });
}

/**
 * Submit a petition for review
 */
export async function submitPetition(
  petitionId: string
): Promise<ActionResponse<boolean>> {
  try {
    const sessionResult = await getSession();
    if (!sessionResult.success || !sessionResult.data) {
      return {
        success: false,
        error:
          sessionResult.error || serializeError(new Error("No session data")),
      };
    }

    const { user } = sessionResult.data;

    const studentProfile = await db.query.studentProfiles.findFirst({
      where: eq(studentProfiles.authId, user.id),
    });

    if (!studentProfile || !studentProfile.studentId) {
      return {
        success: false,
        error: serializeError(
          new AppError({
            message: "Student profile not found",
            code: "PROFILE_NOT_FOUND",
          })
        ),
      };
    }

    const petition = await db.query.petitions.findFirst({
      where: and(
        eq(petitions.id, petitionId),
        eq(petitions.studentId, studentProfile.studentId),
        eq(petitions.status, "draft")
      ),
      with: {
        courses: true,
        documents: true,
      },
    });

    if (!petition) {
      return {
        success: false,
        error: serializeError(
          new AppError({
            message: "Draft petition not found or not owned by you",
            code: "PETITION_NOT_FOUND",
          })
        ),
      };
    }

    if (petition.courses.length === 0) {
      return {
        success: false,
        error: serializeError(
          new AppError({
            message: "Petition must include at least one course",
            code: "VALIDATION_ERROR",
          })
        ),
      };
    }

    if (!petition.signedDocumentUrl) {
      const hasSignedDoc = petition.documents.some(
        (doc) => doc.documentType === "signed_petition"
      );

      if (!hasSignedDoc) {
        return {
          success: false,
          error: serializeError(
            new AppError({
              message: "Petition requires a signed document",
              code: "MISSING_SIGNED_DOCUMENT",
            })
          ),
        };
      }
    }

    const workflowResult = await initializePetitionWorkflow(petitionId);
    if (!workflowResult.success) {
      return workflowResult;
    }

    // Use notifyPetitionStatusChange instead of sendNotification
    await notifyPetitionStatusChange(
      petitionId,
      petition.referenceNumber,
      user.id,
      "submitted"
    );

    return {
      success: true,
      data: true,
    };
  } catch (error) {
    console.error("Error submitting petition:", error);
    return {
      success: false,
      error: serializeError(error),
    };
  }
}

/**
 * Progress a petition to the next workflow step
 */
export async function progressPetitionWorkflow(
  petitionId: string,
  action: "approve" | "reject",
  comments?: string
): Promise<ActionResponse<boolean>> {
  try {
    const sessionResult = await getSession();
    if (!sessionResult.success || !sessionResult.data) {
      return {
        success: false,
        error:
          sessionResult.error || serializeError(new Error("No session data")),
      };
    }

    const { user } = sessionResult.data;

    const petition = await db.query.petitions.findFirst({
      where: eq(petitions.id, petitionId),
      with: {
        workflowSteps: {
          where: eq(petitionWorkflowSteps.isCurrent, true),
        },
        student: true,
      },
    });

    if (!petition || petition.workflowSteps.length === 0) {
      return {
        success: false,
        error: serializeError(
          new AppError({
            message: "Petition or current workflow step not found",
            code: "PETITION_NOT_FOUND",
          })
        ),
      };
    }

    const currentStep = petition.workflowSteps[0];
    const userRole = await getUserRoleForPetition(petitionId, user.id);

    if (userRole !== currentStep.role && userRole !== "invited_approver") {
      return {
        success: false,
        error: serializeError(
          new AppError({
            message: "You don't have permission to perform this action",
            code: "UNAUTHORIZED",
          })
        ),
      };
    }

    await db.transaction(async (tx) => {
      await tx
        .update(petitionWorkflowSteps)
        .set({
          status: action,
          actionUserId: user.id,
          actionDate: new Date(),
          comments: comments || null,
        })
        .where(eq(petitionWorkflowSteps.id, currentStep.id));

      const allSteps = await tx.query.petitionWorkflowSteps.findMany({
        where: eq(petitionWorkflowSteps.petitionId, petitionId),
        orderBy: [petitionWorkflowSteps.orderIndex],
      });

      const currentIndex = allSteps.findIndex((s) => s.id === currentStep.id);

      if (action === "approve") {
        if (currentIndex < allSteps.length - 1) {
          const nextStep = allSteps[currentIndex + 1];
          const newStatus = mapRoleToStatus(nextStep.role, "pending");

          await tx
            .update(petitionWorkflowSteps)
            .set({
              isCurrent: true,
              status: "pending",
            })
            .where(eq(petitionWorkflowSteps.id, nextStep.id));

          await tx
            .update(petitions)
            .set({
              status: newStatus,
              updatedAt: new Date(),
            })
            .where(eq(petitions.id, petitionId));

          const nextParticipant = await tx.query.petitionParticipants.findFirst(
            {
              where: and(
                eq(petitionParticipants.petitionId, petitionId),
                eq(petitionParticipants.role, nextStep.role)
              ),
            }
          );

          if (nextParticipant) {
            await tx
              .update(petitionParticipants)
              .set({
                isNotified: true,
              })
              .where(eq(petitionParticipants.id, nextParticipant.id));

            await notifyPetitionStatusChange(
              petitionId,
              petition.referenceNumber,
              nextParticipant.userId,
              newStatus,
              undefined,
              tx
            );
          }
        } else {
          await tx
            .update(petitions)
            .set({
              status: "completed",
              updatedAt: new Date(),
            })
            .where(eq(petitions.id, petitionId));

          const studentUser = await tx.query.authUsers.findFirst({
            where: eq(authUsers.id, petition.student.authId),
          });

          if (studentUser) {
            await notifyPetitionStatusChange(
              petitionId,
              petition.referenceNumber,
              studentUser.id,
              "completed",
              undefined,
              tx
            );
          }
        }
      } else if (action === "reject") {
        const newStatus = mapRoleToStatus(currentStep.role, "rejected");

        await tx
          .update(petitions)
          .set({
            status: newStatus,
            updatedAt: new Date(),
          })
          .where(eq(petitions.id, petitionId));

        const studentUser = await tx.query.authUsers.findFirst({
          where: eq(authUsers.id, petition.student.authId),
        });

        if (studentUser) {
          await notifyPetitionStatusChange(
            petitionId,
            petition.referenceNumber,
            studentUser.id,
            newStatus,
            currentStep.role,
            tx
          );
        }
      }
    });

    revalidatePath("/petitions");
    revalidatePath(`/petitions/${petitionId}`);

    return {
      success: true,
      data: true,
    };
  } catch (error) {
    console.error("Error progressing petition workflow:", error);
    return {
      success: false,
      error: serializeError(error),
    };
  }
}

/**
 * Map role to petition status
 */
function mapRoleToStatus(
  role: string,
  action: "pending" | "approved" | "rejected"
): PetitionStatus {
  if (action === "pending") {
    switch (role) {
      case "academic_advisor":
        return "submitted";
      case "hod":
        return "advisor_approved";
      case "provost":
        return "hod_approved";
      case "registry":
        return "provost_approved";
      default:
        return "submitted";
    }
  } else if (action === "approved") {
    switch (role) {
      case "academic_advisor":
        return "advisor_approved";
      case "hod":
        return "hod_approved";
      case "provost":
        return "provost_approved";
      case "registry":
        return "completed";
      default:
        return "submitted";
    }
  } else if (action === "rejected") {
    switch (role) {
      case "academic_advisor":
        return "advisor_rejected";
      case "hod":
        return "hod_rejected";
      case "provost":
        return "provost_rejected";
      default:
        return "submitted";
    }
  }

  return "submitted";
}

/**
 * Helper to format role name for display
 */
function formatRoleName(role: string): string {
  switch (role) {
    case "academic_advisor":
      return "Academic Advisor";
    case "hod":
      return "Department Head";
    case "provost":
      return "Provost";
    case "registry":
      return "Registry";
    case "invited_approver":
      return "Invited Approver";
    default:
      return role.replace(/_/g, " ");
  }
}

/**
 * Get the user's role for a specific petition
 */
async function getUserRoleForPetition(
  petitionId: string,
  userId: string
): Promise<string | null> {
  const participant = await db.query.petitionParticipants.findFirst({
    where: and(
      eq(petitionParticipants.petitionId, petitionId),
      eq(petitionParticipants.userId, userId)
    ),
  });

  return participant ? participant.role : null;
}

/**
 * Add a message to a petition
 */
export async function addPetitionMessage(
  input: PetitionMessageInput
): Promise<ActionResponse<{ id: string }>> {
  try {
    const sessionResult = await getSession();
    if (!sessionResult.success || !sessionResult.data) {
      return {
        success: false,
        error:
          sessionResult.error || serializeError(new Error("No session data")),
      };
    }

    const { user } = sessionResult.data;

    const validationResult = petitionMessageSchema.safeParse(input);
    if (!validationResult.success) {
      const validationError = new ValidationError(
        "Invalid message data",
        formatZodErrors(validationResult.error)
      );

      return {
        success: false,
        error: validationError.serialize(),
      };
    }

    const petitionRecord = await db.query.petitions.findFirst({
      where: eq(petitions.id, input.petitionId),
      with: {
        participants: true,
      },
    });

    if (!petitionRecord) {
      return {
        success: false,
        error: serializeError(
          new AppError({
            message: "Petition not found",
            code: "PETITION_NOT_FOUND",
          })
        ),
      };
    }

    const studentProfile = await db.query.studentProfiles.findFirst({
      where: eq(studentProfiles.authId, user.id),
    });

    const isParticipant = petitionRecord.participants.some(
      (p) => p.userId === user.id
    );

    const isOwner = studentProfile?.studentId === petitionRecord.studentId;

    if (!isParticipant && !isOwner) {
      return {
        success: false,
        error: serializeError(
          new AppError({
            message: "You don't have permission to message in this petition",
            code: "UNAUTHORIZED",
          })
        ),
      };
    }

    if (input.isAdminOnly && user.role === "student") {
      return {
        success: false,
        error: serializeError(
          new AppError({
            message: "Students cannot send admin-only messages",
            code: "UNAUTHORIZED",
          })
        ),
      };
    }

    const [message] = await db
      .insert(petitionMessages)
      .values({
        ...validationResult.data,
        userId: user.id,
      })
      .returning({ id: petitionMessages.id });

    await notifyAboutNewMessage(
      input.petitionId,
      user.id,
      input.message,
      input.isAdminOnly
    );

    revalidatePath(`/petitions/${input.petitionId}`);

    return {
      success: true,
      data: { id: message.id },
    };
  } catch (error) {
    console.error("Error adding petition message:", error);
    return {
      success: false,
      error: serializeError(error),
    };
  }
}

/**
 * Helper to notify participants about a new message
 */
async function notifyAboutNewMessage(
  petitionId: string,
  senderUserId: string,
  messageText: string,
  isAdminOnly: boolean
): Promise<void> {
  const petition = await db.query.petitions.findFirst({
    where: eq(petitions.id, petitionId),
    with: {
      participants: true,
      student: true,
    },
  });

  if (!petition) return;

  let recipientUserIds: string[] = [];

  if (isAdminOnly) {
    recipientUserIds = petition.participants
      .filter(
        (p) =>
          p.userId !== senderUserId &&
          p.role !== "student" &&
          p.role !== "observer"
      )
      .map((p) => p.userId);
  } else {
    recipientUserIds = petition.participants
      .filter((p) => p.userId !== senderUserId && p.role !== "observer")
      .map((p) => p.userId);

    const studentUser = await db.query.authUsers.findFirst({
      where: eq(authUsers.id, petition.student.authId),
    });

    if (
      studentUser &&
      studentUser.id !== senderUserId &&
      !recipientUserIds.includes(studentUser.id)
    ) {
      recipientUserIds.push(studentUser.id);
    }
  }

  for (const recipientId of recipientUserIds) {
    await notifyNewMessage(
      petitionId,
      petition.referenceNumber,
      recipientId,
      isAdminOnly
    );
  }
}

/**
 * Invite a user to participate in a petition
 */
export async function inviteParticipant(
  petitionId: string,
  email: string,
  role: string
): Promise<ActionResponse<boolean>> {
  try {
    const sessionResult = await getSession();
    if (!sessionResult.success || !sessionResult.data) {
      return {
        success: false,
        error:
          sessionResult.error || serializeError(new Error("No session data")),
      };
    }

    const { user } = sessionResult.data;

    if (!participantRoleValues.includes(role as any)) {
      return {
        success: false,
        error: serializeError(
          new ValidationError("Invalid role", {
            role: ["Invalid participant role"],
          })
        ),
      };
    }

    const petition = await db.query.petitions.findFirst({
      where: eq(petitions.id, petitionId),
      with: {
        participants: true,
      },
    });

    if (!petition) {
      return {
        success: false,
        error: serializeError(
          new AppError({
            message: "Petition not found",
            code: "PETITION_NOT_FOUND",
          })
        ),
      };
    }

    const userRole = await getUserRoleForPetition(petitionId, user.id);

    if (
      !userRole ||
      (userRole !== "academic_advisor" &&
        userRole !== "hod" &&
        userRole !== "provost" &&
        userRole !== "registry")
    ) {
      return {
        success: false,
        error: serializeError(
          new AppError({
            message: "You don't have permission to invite participants",
            code: "UNAUTHORIZED",
          })
        ),
      };
    }

    const invitedUser = await db.query.authUsers.findFirst({
      where: eq(authUsers.email, email.toLowerCase()),
    });

    if (!invitedUser) {
      return {
        success: false,
        error: serializeError(
          new AppError({
            message: "User with this email not found",
            code: "USER_NOT_FOUND",
          })
        ),
      };
    }

    const isAlreadyParticipant = petition.participants.some(
      (p) => p.userId === invitedUser.id
    );

    if (isAlreadyParticipant) {
      return {
        success: false,
        error: serializeError(
          new AppError({
            message: "User is already a participant in this petition",
            code: "ALREADY_PARTICIPANT",
          })
        ),
      };
    }

    await db.insert(petitionParticipants).values({
      petitionId,
      userId: invitedUser.id,
      role: role as any,
      isNotified: true,
      addedBy: user.id,
    });

    await sendNotification(
      invitedUser.id,
      petitionId,
      "invitation",
      `You have been invited to participate in petition ${petition.referenceNumber} as ${formatRoleName(role)}`
    );

    revalidatePath(`/petitions/${petitionId}`);

    return {
      success: true,
      data: true,
    };
  } catch (error) {
    console.error("Error inviting participant:", error);
    return {
      success: false,
      error: serializeError(error),
    };
  }
}

/**
 * Mark notifications as read
 */
export async function markNotificationsAsRead(
  notificationIds: string[]
): Promise<ActionResponse<boolean>> {
  try {
    const sessionResult = await getSession();
    if (!sessionResult.success || !sessionResult.data) {
      return {
        success: false,
        error:
          sessionResult.error || serializeError(new Error("No session data")),
      };
    }

    const { user } = sessionResult.data;

    const notifications = await db.query.petitionNotifications.findMany({
      where: and(
        inArray(petitionNotifications.id, notificationIds),
        eq(petitionNotifications.recipientUserId, user.id)
      ),
    });

    if (notifications.length === 0) {
      return {
        success: false,
        error: serializeError(
          new AppError({
            message: "No valid notifications found",
            code: "NOTIFICATIONS_NOT_FOUND",
          })
        ),
      };
    }

    await db
      .update(petitionNotifications)
      .set({
        isRead: true,
      })
      .where(
        and(
          inArray(petitionNotifications.id, notificationIds),
          eq(petitionNotifications.recipientUserId, user.id)
        )
      );

    revalidatePath("/notifications");

    return {
      success: true,
      data: true,
    };
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return {
      success: false,
      error: serializeError(error),
    };
  }
}

/**
 * Get available petition types
 */
export async function getPetitionTypes(): Promise<
  ActionResponse<PetitionTypeRecord[]>
> {
  try {
    const types = await db.query.petitionTypes.findMany({
      orderBy: [petitionTypes.name],
    });

    return {
      success: true,
      data: types,
    };
  } catch (error) {
    console.error("Error fetching petition types:", error);
    return {
      success: false,
      error: serializeError(error),
    };
  }
}

/**
 * Get petitions for the current user
 */
export async function getUserPetitions(): Promise<
  ActionResponse<(typeof petitions.$inferSelect)[]>
> {
  try {
    const sessionResult = await getSession();
    if (!sessionResult.success || !sessionResult.data) {
      return {
        success: false,
        error:
          sessionResult.error || serializeError(new Error("No session data")),
      };
    }

    const { user } = sessionResult.data;

    let userPetitions = [];

    if (user.role === "student") {
      const studentProfile = await db.query.studentProfiles.findFirst({
        where: eq(studentProfiles.authId, user.id),
      });

      if (!studentProfile || !studentProfile.studentId) {
        return {
          success: false,
          error: serializeError(new Error("No student profile found")),
        };
      }

      userPetitions = await db.query.petitions.findMany({
        where: eq(petitions.studentId, studentProfile.studentId),
        orderBy: [desc(petitions.updatedAt)],
        with: {
          petitionType: true,
          courses: true,
          workflowSteps: {
            where: eq(petitionWorkflowSteps.isCurrent, true),
          },
        },
      });
    } else {
      const participations = await db.query.petitionParticipants.findMany({
        where: eq(petitionParticipants.userId, user.id),
        with: {
          petition: {
            with: {
              petitionType: true,
              courses: true,
              workflowSteps: {
                where: eq(petitionWorkflowSteps.isCurrent, true),
              },
              student: true,
            },
          },
        },
      });

      userPetitions = participations.map((p) => p.petition);
    }

    return {
      success: true,
      data: userPetitions,
    };
  } catch (error) {
    console.error("Error fetching user petitions:", error);
    return {
      success: false,
      error: serializeError(error),
    };
  }
}
