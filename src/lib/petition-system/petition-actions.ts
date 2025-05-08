// "use server";
//
// import { revalidatePath } from "next/cache";
// import { redirect } from "next/navigation";
//
// import { and, desc, eq, inArray, like } from "drizzle-orm";
// import { z } from "zod";
//
// import { db } from "@/drizzle";
// import { authUsers } from "@/drizzle/schema/auth";
// import { staffProfiles } from "@/drizzle/schema/institution/staff-profiles";
// import {
//   petitionCourseSchema,
//   petitionCourses,
//   petitionDocumentSchema,
//   petitionDocuments,
//   petitionMessageSchema,
//   petitionMessages,
//   petitionNotificationSchema,
//   petitionNotifications,
//   petitionParticipantSchema,
//   petitionParticipants,
//   petitionSchema,
//   petitionTypes,
//   petitionWorkflowStepSchema,
//   petitionWorkflowSteps,
//   petitions,
// } from "@/drizzle/schema/petition-system";
// import {
//   participantRoleValues,
//   petitionStatusValues,
// } from "@/drizzle/schema/petition-system/enums";
// import { studentProfiles } from "@/drizzle/schema/student-records";
// import { getSession } from "@/lib/auth/auth-actions";
// import {
//   AppError,
//   AuthError,
//   ValidationError,
// } from "@/lib/errors/app-error-classes";
// import { formatZodErrors, serializeError } from "@/lib/errors/error-converter";
// import { ActionResponse } from "@/lib/types/common";
//
// /**
//  * Generate a unique reference number for a new petition
//  */
// export async function generatePetitionReferenceNumber(): Promise<string> {
//   const year = new Date().getFullYear();
//   const month = (new Date().getMonth() + 1).toString().padStart(2, "0");
//   const pattern = `P-${year}-${month}-%`;
//
//   // Get the latest petition for this month to increment the count
//   const latestPetition = await db.query.petitions.findFirst({
//     where: like(petitions.referenceNumber, pattern),
//     orderBy: [desc(petitions.referenceNumber)],
//   });
//
//   let sequence = 1;
//   if (latestPetition) {
//     // Extract the sequence number from the latest petition
//     const match = latestPetition.referenceNumber.match(/P-\d{4}-\d{2}-(\d+)/);
//     if (match && match[1]) {
//       sequence = parseInt(match[1]) + 1;
//     }
//   }
//
//   return `P-${year}-${month}-${sequence.toString().padStart(4, "0")}`;
// }
//
// /**
//  * Create a new petition draft
//  */
// export async function createPetitionDraft(
//   input: z.infer<typeof petitionSchema>
// ): Promise<ActionResponse<{ id: string; referenceNumber: string }>> {
//   try {
//     // Get current user session
//     const sessionResult = await getSession();
//     if (!sessionResult.success || !sessionResult.data) {
//       return {
//         success: false,
//         error:
//           sessionResult.error || serializeError(new Error("No session data")),
//       };
//     }
//
//     const { user } = sessionResult.data;
//
//     // Validate input data
//     const validationResult = petitionSchema.safeParse(input);
//     if (!validationResult.success) {
//       const validationError = new ValidationError(
//         "Invalid petition data",
//         formatZodErrors(validationResult.error)
//       );
//
//       return {
//         success: false,
//         error: validationError.serialize(),
//       };
//     }
//
//     // Get student profile for the current user
//     const studentProfile = await db.query.studentProfiles.findFirst({
//       where: eq(studentProfiles.authId, user.id),
//     });
//
//     if (!studentProfile || !studentProfile.studentId) {
//       return {
//         success: false,
//         error: serializeError(
//           new AppError({
//             message: "Student profile not found",
//             code: "PROFILE_NOT_FOUND",
//           })
//         ),
//       };
//     }
//
//     // Generate a unique reference number
//     const referenceNumber = await generatePetitionReferenceNumber();
//
//     // Create the petition draft
//     const [petition] = await db
//       .insert(petitions)
//       .values({
//         ...validationResult.data,
//         referenceNumber,
//         studentId: studentProfile.studentId,
//         status: "draft",
//       })
//       .returning({
//         id: petitions.id,
//         referenceNumber: petitions.referenceNumber,
//       });
//
//     // Automatically add the student as a participant
//     await db.insert(petitionParticipants).values({
//       petitionId: petition.id,
//       userId: user.id,
//       role: "student",
//       isNotified: true, // Student is always notified about their own petition
//     });
//
//     // Revalidate relevant paths
//     revalidatePath("/petitions");
//
//     return {
//       success: true,
//       data: {
//         id: petition.id,
//         referenceNumber: petition.referenceNumber,
//       },
//     };
//   } catch (error) {
//     console.error("Error creating petition draft:", error);
//     return {
//       success: false,
//       error: serializeError(error),
//     };
//   }
// }
//
// /**
//  * Update an existing draft petition
//  */
// export async function updatePetitionDraft(
//   id: string,
//   input: Partial<z.infer<typeof petitionSchema>>
// ): Promise<ActionResponse<{ id: string }>> {
//   try {
//     // Get current user session
//     const sessionResult = await getSession();
//     if (!sessionResult.success || !sessionResult.data) {
//       return {
//         success: false,
//         error:
//           sessionResult.error || serializeError(new Error("No session data")),
//       };
//     }
//
//     const { user } = sessionResult.data;
//
//     // Get student profile for the current user
//     const studentProfile = await db.query.studentProfiles.findFirst({
//       where: eq(studentProfiles.authId, user.id),
//     });
//
//     if (!studentProfile || !studentProfile.studentId) {
//       return {
//         success: false,
//         error: serializeError(
//           new AppError({
//             message: "Student profile not found",
//             code: "PROFILE_NOT_FOUND",
//           })
//         ),
//       };
//     }
//
//     // Check if petition exists and belongs to user
//     const petitionRecord = await db.query.petitions.findFirst({
//       where: and(
//         eq(petitions.id, id),
//         eq(petitions.studentId, studentProfile.studentId),
//         eq(petitions.status, "draft")
//       ),
//     });
//
//     if (!petitionRecord) {
//       return {
//         success: false,
//         error: serializeError(
//           new AppError({
//             message: "Petition draft not found or not owned by you",
//             code: "PETITION_NOT_FOUND",
//           })
//         ),
//       };
//     }
//
//     // Update petition
//     await db
//       .update(petitions)
//       .set({
//         ...input,
//         updatedAt: new Date(),
//       })
//       .where(eq(petitions.id, id));
//
//     // Revalidate paths
//     revalidatePath("/petitions");
//     revalidatePath(`/petitions/${id}`);
//
//     return {
//       success: true,
//       data: { id },
//     };
//   } catch (error) {
//     console.error("Error updating petition draft:", error);
//     return {
//       success: false,
//       error: serializeError(error),
//     };
//   }
// }
//
// /**
//  * Add a course to a petition
//  */
// export async function addPetitionCourse(
//   input: z.infer<typeof petitionCourseSchema>
// ): Promise<ActionResponse<{ id: string }>> {
//   try {
//     // Get current user session
//     const sessionResult = await getSession();
//     if (!sessionResult.success || !sessionResult.data) {
//       return {
//         success: false,
//         error:
//           sessionResult.error || serializeError(new Error("No session data")),
//       };
//     }
//
//     const { user } = sessionResult.data;
//
//     // Validate input
//     const validationResult = petitionCourseSchema.safeParse(input);
//     if (!validationResult.success) {
//       const validationError = new ValidationError(
//         "Invalid petition course data",
//         formatZodErrors(validationResult.error)
//       );
//
//       return {
//         success: false,
//         error: validationError.serialize(),
//       };
//     }
//
//     // Get student profile for the current user
//     const studentProfile = await db.query.studentProfiles.findFirst({
//       where: eq(studentProfiles.authId, user.id),
//     });
//
//     if (!studentProfile || !studentProfile.studentId) {
//       return {
//         success: false,
//         error: serializeError(
//           new AppError({
//             message: "Student profile not found",
//             code: "PROFILE_NOT_FOUND",
//           })
//         ),
//       };
//     }
//
//     // Verify petition exists and belongs to user
//     const petitionRecord = await db.query.petitions.findFirst({
//       where: and(
//         eq(petitions.id, input.petitionId),
//         eq(petitions.studentId, studentProfile.studentId),
//         eq(petitions.status, "draft")
//       ),
//     });
//
//     if (!petitionRecord) {
//       return {
//         success: false,
//         error: serializeError(
//           new AppError({
//             message: "Petition draft not found or not owned by you",
//             code: "PETITION_NOT_FOUND",
//           })
//         ),
//       };
//     }
//
//     // Check if course already exists in petition
//     const existingCourse = await db.query.petitionCourses.findFirst({
//       where: and(
//         eq(petitionCourses.petitionId, input.petitionId),
//         eq(petitionCourses.courseCode, input.courseCode)
//       ),
//     });
//
//     if (existingCourse) {
//       return {
//         success: false,
//         error: serializeError(
//           new AppError({
//             message: "This course is already included in the petition",
//             code: "COURSE_ALREADY_EXISTS",
//           })
//         ),
//       };
//     }
//
//     // Add course to petition
//     const [course] = await db
//       .insert(petitionCourses)
//       .values(validationResult.data)
//       .returning({ id: petitionCourses.id });
//
//     // Revalidate paths
//     revalidatePath(`/petitions/${input.petitionId}`);
//
//     return {
//       success: true,
//       data: { id: course.id },
//     };
//   } catch (error) {
//     console.error("Error adding petition course:", error);
//     return {
//       success: false,
//       error: serializeError(error),
//     };
//   }
// }
//
// /**
//  * Remove a course from a petition
//  */
// export async function removePetitionCourse(
//   courseId: string
// ): Promise<ActionResponse<boolean>> {
//   try {
//     // Get current user session
//     const sessionResult = await getSession();
//     if (!sessionResult.success || !sessionResult.data) {
//       return {
//         success: false,
//         error:
//           sessionResult.error || serializeError(new Error("No session data")),
//       };
//     }
//
//     const { user } = sessionResult.data;
//
//     // Get student profile for the current user
//     const studentProfile = await db.query.studentProfiles.findFirst({
//       where: eq(studentProfiles.authId, user.id),
//     });
//
//     if (!studentProfile || !studentProfile.studentId) {
//       return {
//         success: false,
//         error: serializeError(
//           new AppError({
//             message: "Student profile not found",
//             code: "PROFILE_NOT_FOUND",
//           })
//         ),
//       };
//     }
//
//     // Get the course and verify ownership
//     const course = await db.query.petitionCourses.findFirst({
//       where: eq(petitionCourses.id, courseId),
//       with: {
//         petition: true,
//       },
//     });
//
//     if (!course) {
//       return {
//         success: false,
//         error: serializeError(
//           new AppError({
//             message: "Course not found in petition",
//             code: "COURSE_NOT_FOUND",
//           })
//         ),
//       };
//     }
//
//     // Verify petition ownership and status
//     if (
//       course.petition.studentId !== studentProfile.studentId ||
//       course.petition.status !== "draft"
//     ) {
//       return {
//         success: false,
//         error: serializeError(
//           new AppError({
//             message: "Cannot remove course - petition is not your draft",
//             code: "UNAUTHORIZED",
//           })
//         ),
//       };
//     }
//
//     // Remove the course
//     await db.delete(petitionCourses).where(eq(petitionCourses.id, courseId));
//
//     // Revalidate paths
//     revalidatePath(`/petitions/${course.petitionId}`);
//
//     return {
//       success: true,
//       data: true,
//     };
//   } catch (error) {
//     console.error("Error removing petition course:", error);
//     return {
//       success: false,
//       error: serializeError(error),
//     };
//   }
// }
//
// /**
//  * Add a document to a petition
//  */
// export async function addPetitionDocument(
//   input: z.infer<typeof petitionDocumentSchema>
// ): Promise<ActionResponse<{ id: string }>> {
//   try {
//     // Get current user session
//     const sessionResult = await getSession();
//     if (!sessionResult.success || !sessionResult.data) {
//       return {
//         success: false,
//         error:
//           sessionResult.error || serializeError(new Error("No session data")),
//       };
//     }
//
//     const { user } = sessionResult.data;
//
//     // Validate input
//     const validationResult = petitionDocumentSchema.safeParse(input);
//     if (!validationResult.success) {
//       const validationError = new ValidationError(
//         "Invalid document data",
//         formatZodErrors(validationResult.error)
//       );
//
//       return {
//         success: false,
//         error: validationError.serialize(),
//       };
//     }
//
//     // Verify petition exists
//     const petitionRecord = await db.query.petitions.findFirst({
//       where: eq(petitions.id, input.petitionId),
//       with: {
//         participants: true,
//       },
//     });
//
//     if (!petitionRecord) {
//       return {
//         success: false,
//         error: serializeError(
//           new AppError({
//             message: "Petition not found",
//             code: "PETITION_NOT_FOUND",
//           })
//         ),
//       };
//     }
//
//     // Get student profile for the current user if they're a student
//     const studentProfile = await db.query.studentProfiles.findFirst({
//       where: eq(studentProfiles.authId, user.id),
//     });
//
//     // Check if user is a participant or the petition owner
//     const isParticipant = petitionRecord.participants.some(
//       (p) => p.userId === user.id
//     );
//
//     const isOwner = studentProfile?.studentId === petitionRecord.studentId;
//
//     if (!isParticipant && !isOwner) {
//       return {
//         success: false,
//         error: serializeError(
//           new AppError({
//             message:
//               "You don't have permission to add documents to this petition",
//             code: "UNAUTHORIZED",
//           })
//         ),
//       };
//     }
//
//     // Add document
//     const [document] = await db
//       .insert(petitionDocuments)
//       .values({
//         ...validationResult.data,
//         uploadedBy: user.id,
//       })
//       .returning({ id: petitionDocuments.id });
//
//     // Revalidate paths
//     revalidatePath(`/petitions/${input.petitionId}`);
//
//     return {
//       success: true,
//       data: { id: document.id },
//     };
//   } catch (error) {
//     console.error("Error adding petition document:", error);
//     return {
//       success: false,
//       error: serializeError(error),
//     };
//   }
// }
//
// /**
//  * Delete a document from a petition
//  */
// export async function deletePetitionDocument(
//   documentId: string
// ): Promise<ActionResponse<boolean>> {
//   try {
//     // Get current user session
//     const sessionResult = await getSession();
//     if (!sessionResult.success || !sessionResult.data) {
//       return {
//         success: false,
//         error:
//           sessionResult.error || serializeError(new Error("No session data")),
//       };
//     }
//
//     const { user } = sessionResult.data;
//
//     // Get the document
//     const document = await db.query.petitionDocuments.findFirst({
//       where: eq(petitionDocuments.id, documentId),
//       with: {
//         petition: true,
//       },
//     });
//
//     if (!document) {
//       return {
//         success: false,
//         error: serializeError(
//           new AppError({
//             message: "Document not found",
//             code: "DOCUMENT_NOT_FOUND",
//           })
//         ),
//       };
//     }
//
//     // Get student profile for the current user if they're a student
//     const studentProfile = await db.query.studentProfiles.findFirst({
//       where: eq(studentProfiles.authId, user.id),
//     });
//
//     // Check permissions
//     const isUploader = document.uploadedBy === user.id;
//     const isOwner = studentProfile?.studentId === document.petition.studentId;
//
//     if (!isUploader && !isOwner) {
//       return {
//         success: false,
//         error: serializeError(
//           new AppError({
//             message: "You don't have permission to delete this document",
//             code: "UNAUTHORIZED",
//           })
//         ),
//       };
//     }
//
//     // Only allow deletion if petition is in draft
//     if (document.petition.status !== "draft") {
//       return {
//         success: false,
//         error: serializeError(
//           new AppError({
//             message: "Cannot delete document from submitted petition",
//             code: "INVALID_OPERATION",
//           })
//         ),
//       };
//     }
//
//     // Delete the document
//     await db
//       .delete(petitionDocuments)
//       .where(eq(petitionDocuments.id, documentId));
//
//     // Revalidate paths
//     revalidatePath(`/petitions/${document.petitionId}`);
//
//     return {
//       success: true,
//       data: true,
//     };
//   } catch (error) {
//     console.error("Error deleting petition document:", error);
//     return {
//       success: false,
//       error: serializeError(error),
//     };
//   }
// }
//
// /**
//  * Initialize the workflow steps for a petition
//  */
// export async function initializePetitionWorkflow(
//   petitionId: string
// ): Promise<ActionResponse<boolean>> {
//   try {
//     // Get current user session
//     const sessionResult = await getSession();
//     if (!sessionResult.success || !sessionResult.data) {
//       return {
//         success: false,
//         error:
//           sessionResult.error || serializeError(new Error("No session data")),
//       };
//     }
//
//     const { user } = sessionResult.data;
//
//     // Get student profile for the current user
//     const studentProfile = await db.query.studentProfiles.findFirst({
//       where: eq(studentProfiles.authId, user.id),
//     });
//
//     if (!studentProfile || !studentProfile.studentId) {
//       return {
//         success: false,
//         error: serializeError(
//           new AppError({
//             message: "Student profile not found",
//             code: "PROFILE_NOT_FOUND",
//           })
//         ),
//       };
//     }
//
//     // Get the petition
//     const petition = await db.query.petitions.findFirst({
//       where: and(
//         eq(petitions.id, petitionId),
//         eq(petitions.studentId, studentProfile.studentId),
//         eq(petitions.status, "draft")
//       ),
//       with: {
//         petitionType: true,
//       },
//     });
//
//     if (!petition) {
//       return {
//         success: false,
//         error: serializeError(
//           new AppError({
//             message: "Draft petition not found or not owned by you",
//             code: "PETITION_NOT_FOUND",
//           })
//         ),
//       };
//     }
//
//     // Standard workflow steps in order
//     const workflowSteps = [
//       { role: "academic_advisor", isMandatory: true },
//       { role: "hod", isMandatory: true },
//       { role: "provost", isMandatory: true },
//       { role: "registry", isMandatory: true },
//     ];
//
//     // Create each workflow step in a transaction
//     await db.transaction(async (tx) => {
//       // Insert workflow steps
//       for (let i = 0; i < workflowSteps.length; i++) {
//         const step = workflowSteps[i];
//         await tx.insert(petitionWorkflowSteps).values({
//           petitionId,
//           role: step.role,
//           orderIndex: i,
//           isMandatory: step.isMandatory,
//           isCurrent: i === 0, // First step is current
//           status: i === 0 ? "pending" : null, // Set first step as pending
//         });
//       }
//
//       // Update petition status
//       await tx
//         .update(petitions)
//         .set({
//           status: "submitted",
//           updatedAt: new Date(),
//         })
//         .where(eq(petitions.id, petitionId));
//     });
//
//     // Add default participants based on the department and student info
//     await addDefaultParticipants(petitionId);
//
//     // Revalidate paths
//     revalidatePath("/petitions");
//     revalidatePath(`/petitions/${petitionId}`);
//
//     return {
//       success: true,
//       data: true,
//     };
//   } catch (error) {
//     console.error("Error initializing petition workflow:", error);
//     return {
//       success: false,
//       error: serializeError(error),
//     };
//   }
// }
//
// /**
//  * Helper function to add default participants to a petition
//  */
// async function addDefaultParticipants(petitionId: string): Promise<void> {
//   // Get the petition with student info
//   const petition = await db.query.petitions.findFirst({
//     where: eq(petitions.id, petitionId),
//     with: {
//       student: true,
//     },
//   });
//
//   if (!petition) return;
//
//   // Find the academic advisor for the student
//   const academicAdvisor = await db.query.authUsers.findFirst({
//     where: eq(authUsers.role, "academic_advisor"),
//   });
//
//   // Find the HOD for the primary department
//   const hod = await db.query.authUsers.findFirst({
//     where: eq(authUsers.role, "hod"),
//   });
//
//   // Find a provost
//   const provost = await db.query.authUsers.findFirst({
//     where: eq(authUsers.role, "provost"),
//   });
//
//   // Find registry staff
//   const registry = await db.query.authUsers.findFirst({
//     where: eq(authUsers.role, "registry"),
//   });
//
//   // Add participants in a transaction
//   await db.transaction(async (tx) => {
//     // Get the student user
//     const studentUser = await tx.query.authUsers.findFirst({
//       where: eq(authUsers.id, petition.student.authId),
//     });
//
//     // Add academic advisor
//     if (academicAdvisor) {
//       await tx.insert(petitionParticipants).values({
//         petitionId,
//         userId: academicAdvisor.id,
//         role: "academic_advisor",
//         isNotified: true, // Notify immediately
//       });
//
//       // Create notification
//       await tx.insert(petitionNotifications).values({
//         petitionId,
//         recipientUserId: academicAdvisor.id,
//         type: "new_petition",
//         message: `New petition ${petition.referenceNumber} requires your review`,
//       });
//     }
//
//     // Add HOD
//     if (hod) {
//       await tx.insert(petitionParticipants).values({
//         petitionId,
//         userId: hod.id,
//         role: "hod",
//         isNotified: false, // Will be notified after advisor reviews
//       });
//     }
//
//     // Add provost
//     if (provost) {
//       await tx.insert(petitionParticipants).values({
//         petitionId,
//         userId: provost.id,
//         role: "provost",
//         isNotified: false, // Will be notified after HOD reviews
//       });
//     }
//
//     // Add registry
//     if (registry) {
//       await tx.insert(petitionParticipants).values({
//         petitionId,
//         userId: registry.id,
//         role: "registry",
//         isNotified: false, // Will be notified after provost approves
//       });
//     }
//   });
// }
//
// /**
//  * Submit a petition for review
//  */
// export async function submitPetition(
//   petitionId: string
// ): Promise<ActionResponse<boolean>> {
//   try {
//     // Get current user session
//     const sessionResult = await getSession();
//     if (!sessionResult.success || !sessionResult.data) {
//       return {
//         success: false,
//         error:
//           sessionResult.error || serializeError(new Error("No session data")),
//       };
//     }
//
//     const { user } = sessionResult.data;
//
//     // Get student profile for the current user
//     const studentProfile = await db.query.studentProfiles.findFirst({
//       where: eq(studentProfiles.authId, user.id),
//     });
//
//     if (!studentProfile || !studentProfile.studentId) {
//       return {
//         success: false,
//         error: serializeError(
//           new AppError({
//             message: "Student profile not found",
//             code: "PROFILE_NOT_FOUND",
//           })
//         ),
//       };
//     }
//
//     // Verify petition is a draft and belongs to user
//     const petition = await db.query.petitions.findFirst({
//       where: and(
//         eq(petitions.id, petitionId),
//         eq(petitions.studentId, studentProfile.studentId),
//         eq(petitions.status, "draft")
//       ),
//       with: {
//         courses: true,
//         documents: true,
//       },
//     });
//
//     if (!petition) {
//       return {
//         success: false,
//         error: serializeError(
//           new AppError({
//             message: "Draft petition not found or not owned by you",
//             code: "PETITION_NOT_FOUND",
//           })
//         ),
//       };
//     }
//
//     // Validate petition has required elements based on type
//     if (petition.courses.length === 0) {
//       return {
//         success: false,
//         error: serializeError(
//           new AppError({
//             message: "Petition must include at least one course",
//             code: "VALIDATION_ERROR",
//           })
//         ),
//       };
//     }
//
//     // Check for signed document
//     if (!petition.signedDocumentUrl) {
//       const hasSignedDoc = petition.documents.some(
//         (doc) => doc.documentType === "signed_petition"
//       );
//
//       if (!hasSignedDoc) {
//         return {
//           success: false,
//           error: serializeError(
//             new AppError({
//               message: "Petition requires a signed document",
//               code: "MISSING_SIGNED_DOCUMENT",
//             })
//           ),
//         };
//       }
//     }
//
//     // Initialize workflow
//     const workflowResult = await initializePetitionWorkflow(petitionId);
//     if (!workflowResult.success) {
//       return workflowResult;
//     }
//
//     // Send notification to student
//     await db.insert(petitionNotifications).values({
//       petitionId,
//       recipientUserId: user.id,
//       type: "petition_submitted",
//       message: `Your petition ${petition.referenceNumber} has been submitted for review`,
//     });
//
//     return {
//       success: true,
//       data: true,
//     };
//   } catch (error) {
//     console.error("Error submitting petition:", error);
//     return {
//       success: false,
//       error: serializeError(error),
//     };
//   }
// }
//
// /**
//  * Progress a petition to the next workflow step
//  */
// export async function progressPetitionWorkflow(
//   petitionId: string,
//   action: "approve" | "reject",
//   comments?: string
// ): Promise<ActionResponse<boolean>> {
//   try {
//     // Get current user session
//     const sessionResult = await getSession();
//     if (!sessionResult.success || !sessionResult.data) {
//       return {
//         success: false,
//         error:
//           sessionResult.error || serializeError(new Error("No session data")),
//       };
//     }
//
//     const { user } = sessionResult.data;
//
//     // Get the petition with current workflow step
//     const petition = await db.query.petitions.findFirst({
//       where: eq(petitions.id, petitionId),
//       with: {
//         workflowSteps: {
//           where: eq(petitionWorkflowSteps.isCurrent, true),
//         },
//         student: true,
//       },
//     });
//
//     if (!petition || petition.workflowSteps.length === 0) {
//       return {
//         success: false,
//         error: serializeError(
//           new AppError({
//             message: "Petition or current workflow step not found",
//             code: "PETITION_NOT_FOUND",
//           })
//         ),
//       };
//     }
//
//     const currentStep = petition.workflowSteps[0];
//
//     // Verify user has permission for this step
//     const userRole = await getUserRoleForPetition(petitionId, user.id);
//
//     if (userRole !== currentStep.role && userRole !== "invited_approver") {
//       return {
//         success: false,
//         error: serializeError(
//           new AppError({
//             message: "You don't have permission to perform this action",
//             code: "UNAUTHORIZED",
//           })
//         ),
//       };
//     }
//
//     // Transaction to update current step and set next step
//     await db.transaction(async (tx) => {
//       // Update current step
//       await tx
//         .update(petitionWorkflowSteps)
//         .set({
//           status: action,
//           actionUserId: user.id,
//           actionDate: new Date(),
//           comments: comments || null,
//         })
//         .where(eq(petitionWorkflowSteps.id, currentStep.id));
//
//       // Get all workflow steps in order
//       const allSteps = await tx.query.petitionWorkflowSteps.findMany({
//         where: eq(petitionWorkflowSteps.petitionId, petitionId),
//         orderBy: [petitionWorkflowSteps.orderIndex],
//       });
//
//       // Find current step index
//       const currentIndex = allSteps.findIndex((s) => s.id === currentStep.id);
//
//       if (action === "approve") {
//         // If there are more steps, set the next one as current
//         if (currentIndex < allSteps.length - 1) {
//           const nextStep = allSteps[currentIndex + 1];
//
//           await tx
//             .update(petitionWorkflowSteps)
//             .set({
//               isCurrent: true,
//               status: "pending",
//             })
//             .where(eq(petitionWorkflowSteps.id, nextStep.id));
//
//           // Update petition status based on next role
//           await tx
//             .update(petitions)
//             .set({
//               status: mapRoleToStatus(nextStep.role, "pending"),
//               updatedAt: new Date(),
//             })
//             .where(eq(petitions.id, petitionId));
//
//           // Notify the next approver
//           await notifyNextApprover(
//             tx,
//             petitionId,
//             nextStep.role,
//             petition.referenceNumber
//           );
//         } else {
//           // This was the last step - mark petition as completed
//           await tx
//             .update(petitions)
//             .set({
//               status: "completed",
//               updatedAt: new Date(),
//             })
//             .where(eq(petitions.id, petitionId));
//
//           // Notify student of completion
//           const studentUser = await tx.query.authUsers.findFirst({
//             where: eq(authUsers.id, petition.student.authId),
//           });
//
//           if (studentUser) {
//             await tx.insert(petitionNotifications).values({
//               petitionId,
//               recipientUserId: studentUser.id,
//               type: "petition_approved",
//               message: `Your petition ${petition.referenceNumber} has been approved and completed`,
//             });
//           }
//         }
//       } else if (action === "reject") {
//         // Update petition status to reflect rejection
//         await tx
//           .update(petitions)
//           .set({
//             status: mapRoleToStatus(currentStep.role, "rejected"),
//             updatedAt: new Date(),
//           })
//           .where(eq(petitions.id, petitionId));
//
//         // Notify student of rejection
//         const studentUser = await tx.query.authUsers.findFirst({
//           where: eq(authUsers.id, petition.student.authId),
//         });
//
//         if (studentUser) {
//           await tx.insert(petitionNotifications).values({
//             petitionId,
//             recipientUserId: studentUser.id,
//             type: "petition_rejected",
//             message: `Your petition ${petition.referenceNumber} was rejected by ${formatRoleName(currentStep.role)}`,
//           });
//         }
//       }
//     });
//
//     // Revalidate paths
//     revalidatePath("/petitions");
//     revalidatePath(`/petitions/${petitionId}`);
//
//     return {
//       success: true,
//       data: true,
//     };
//   } catch (error) {
//     console.error("Error progressing petition workflow:", error);
//     return {
//       success: false,
//       error: serializeError(error),
//     };
//   }
// }
//
// /**
//  * Helper function to notify the next approver
//  */
// async function notifyNextApprover(
//   tx: any,
//   petitionId: string,
//   role: string,
//   referenceNumber: string
// ): Promise<void> {
//   // Find participant with this role
//   const participant = await tx.query.petitionParticipants.findFirst({
//     where: and(
//       eq(petitionParticipants.petitionId, petitionId),
//       eq(petitionParticipants.role, role)
//     ),
//   });
//
//   if (participant) {
//     // Update notification status
//     await tx
//       .update(petitionParticipants)
//       .set({
//         isNotified: true,
//       })
//       .where(eq(petitionParticipants.id, participant.id));
//
//     // Create notification
//     await tx.insert(petitionNotifications).values({
//       petitionId,
//       recipientUserId: participant.userId,
//       type: "petition_ready_for_review",
//       message: `Petition ${referenceNumber} is ready for your review`,
//     });
//   }
// }
//
// /**
//  * Map role to petition status
//  */
// function mapRoleToStatus(
//   role: string,
//   action: "pending" | "approved" | "rejected"
// ): string {
//   if (action === "pending") {
//     switch (role) {
//       case "academic_advisor":
//         return "submitted";
//       case "hod":
//         return "advisor_approved";
//       case "provost":
//         return "hod_approved";
//       case "registry":
//         return "registry_processing";
//       default:
//         return "submitted";
//     }
//   } else if (action === "approved") {
//     switch (role) {
//       case "academic_advisor":
//         return "advisor_approved";
//       case "hod":
//         return "hod_approved";
//       case "provost":
//         return "provost_approved";
//       case "registry":
//         return "completed";
//       default:
//         return "submitted";
//     }
//   } else if (action === "rejected") {
//     switch (role) {
//       case "academic_advisor":
//         return "advisor_rejected";
//       case "hod":
//         return "hod_rejected";
//       case "provost":
//         return "provost_rejected";
//       default:
//         return "submitted";
//     }
//   }
//
//   return "submitted";
// }
//
// /**
//  * Helper to format role name for display
//  */
// function formatRoleName(role: string): string {
//   switch (role) {
//     case "academic_advisor":
//       return "Academic Advisor";
//     case "hod":
//       return "Department Head";
//     case "provost":
//       return "Provost";
//     case "registry":
//       return "Registry";
//     case "invited_approver":
//       return "Invited Approver";
//     default:
//       return role.replace(/_/g, " ");
//   }
// }
//
// /**
//  * Get the user's role for a specific petition
//  */
// async function getUserRoleForPetition(
//   petitionId: string,
//   userId: string
// ): Promise<string | null> {
//   const participant = await db.query.petitionParticipants.findFirst({
//     where: and(
//       eq(petitionParticipants.petitionId, petitionId),
//       eq(petitionParticipants.userId, userId)
//     ),
//   });
//
//   return participant ? participant.role : null;
// }
//
// /**
//  * Add a message to a petition
//  */
// export async function addPetitionMessage(
//   input: z.infer<typeof petitionMessageSchema>
// ): Promise<ActionResponse<{ id: string }>> {
//   try {
//     // Get current user session
//     const sessionResult = await getSession();
//     if (!sessionResult.success || !sessionResult.data) {
//       return {
//         success: false,
//         error:
//           sessionResult.error || serializeError(new Error("No session data")),
//       };
//     }
//
//     const { user } = sessionResult.data;
//
//     // Validate input
//     const validationResult = petitionMessageSchema.safeParse(input);
//     if (!validationResult.success) {
//       const validationError = new ValidationError(
//         "Invalid message data",
//         formatZodErrors(validationResult.error)
//       );
//
//       return {
//         success: false,
//         error: validationError.serialize(),
//       };
//     }
//
//     // Verify access to petition
//     const petitionRecord = await db.query.petitions.findFirst({
//       where: eq(petitions.id, input.petitionId),
//       with: {
//         participants: true,
//       },
//     });
//
//     if (!petitionRecord) {
//       return {
//         success: false,
//         error: serializeError(
//           new AppError({
//             message: "Petition not found",
//             code: "PETITION_NOT_FOUND",
//           })
//         ),
//       };
//     }
//
//     // Get student profile for the current user if they're a student
//     const studentProfile = await db.query.studentProfiles.findFirst({
//       where: eq(studentProfiles.authId, user.id),
//     });
//
//     // Check if user is a participant or the petition owner
//     const isParticipant = petitionRecord.participants.some(
//       (p) => p.userId === user.id
//     );
//
//     const isOwner = studentProfile?.studentId === petitionRecord.studentId;
//
//     if (!isParticipant && !isOwner) {
//       return {
//         success: false,
//         error: serializeError(
//           new AppError({
//             message: "You don't have permission to message in this petition",
//             code: "UNAUTHORIZED",
//           })
//         ),
//       };
//     }
//
//     // Admin-only messages can only be sent by staff roles
//     if (input.isAdminOnly && user.role === "student") {
//       return {
//         success: false,
//         error: serializeError(
//           new AppError({
//             message: "Students cannot send admin-only messages",
//             code: "UNAUTHORIZED",
//           })
//         ),
//       };
//     }
//
//     // Add message
//     const [message] = await db
//       .insert(petitionMessages)
//       .values({
//         ...validationResult.data,
//         userId: user.id,
//       })
//       .returning({ id: petitionMessages.id });
//
//     // Notify participants of new message
//     await notifyAboutNewMessage(
//       input.petitionId,
//       user.id,
//       input.message,
//       input.isAdminOnly
//     );
//
//     // Revalidate paths
//     revalidatePath(`/petitions/${input.petitionId}`);
//
//     return {
//       success: true,
//       data: { id: message.id },
//     };
//   } catch (error) {
//     console.error("Error adding petition message:", error);
//     return {
//       success: false,
//       error: serializeError(error),
//     };
//   }
// }
//
// /**
//  * Helper to notify participants about a new message
//  */
// async function notifyAboutNewMessage(
//   petitionId: string,
//   senderUserId: string,
//   messageText: string,
//   isAdminOnly: boolean
// ): Promise<void> {
//   // Get petition with participants
//   const petition = await db.query.petitions.findFirst({
//     where: eq(petitions.id, petitionId),
//     with: {
//       participants: true,
//       student: true,
//     },
//   });
//
//   if (!petition) return;
//
//   // Determine which participants to notify
//   let recipientUserIds: string[] = [];
//
//   if (isAdminOnly) {
//     // For admin-only messages, only notify staff participants
//     recipientUserIds = petition.participants
//       .filter(
//         (p) =>
//           p.userId !== senderUserId &&
//           p.role !== "student" &&
//           p.role !== "observer"
//       )
//       .map((p) => p.userId);
//   } else {
//     // For regular messages, notify all participants except the sender and observers
//     recipientUserIds = petition.participants
//       .filter((p) => p.userId !== senderUserId && p.role !== "observer")
//       .map((p) => p.userId);
//
//     // Always include the petition owner
//     const studentUser = await db.query.authUsers.findFirst({
//       where: eq(authUsers.id, petition.student.authId),
//     });
//
//     if (
//       studentUser &&
//       studentUser.id !== senderUserId &&
//       !recipientUserIds.includes(studentUser.id)
//     ) {
//       recipientUserIds.push(studentUser.id);
//     }
//   }
//
//   // Create notifications for all recipients
//   for (const recipientId of recipientUserIds) {
//     await db.insert(petitionNotifications).values({
//       petitionId,
//       recipientUserId: recipientId,
//       type: "new_message",
//       message: `New message in petition ${petition.referenceNumber}`,
//     });
//   }
// }
//
// /**
//  * Invite a user to participate in a petition
//  */
// export async function inviteParticipant(
//   petitionId: string,
//   email: string,
//   role: string
// ): Promise<ActionResponse<boolean>> {
//   try {
//     // Get current user session
//     const sessionResult = await getSession();
//     if (!sessionResult.success || !sessionResult.data) {
//       return {
//         success: false,
//         error:
//           sessionResult.error || serializeError(new Error("No session data")),
//       };
//     }
//
//     const { user } = sessionResult.data;
//
//     // Validate role
//     if (!participantRoleValues.includes(role as any)) {
//       return {
//         success: false,
//         error: serializeError(
//           new ValidationError("Invalid role", {
//             role: ["Invalid participant role"],
//           })
//         ),
//       };
//     }
//
//     // Get petition and verify access
//     const petition = await db.query.petitions.findFirst({
//       where: eq(petitions.id, petitionId),
//       with: {
//         participants: true,
//       },
//     });
//
//     if (!petition) {
//       return {
//         success: false,
//         error: serializeError(
//           new AppError({
//             message: "Petition not found",
//             code: "PETITION_NOT_FOUND",
//           })
//         ),
//       };
//     }
//
//     // Check if user has permission to invite others
//     const userRole = await getUserRoleForPetition(petitionId, user.id);
//
//     if (
//       !userRole ||
//       (userRole !== "academic_advisor" &&
//         userRole !== "hod" &&
//         userRole !== "provost" &&
//         userRole !== "registry")
//     ) {
//       return {
//         success: false,
//         error: serializeError(
//           new AppError({
//             message: "You don't have permission to invite participants",
//             code: "UNAUTHORIZED",
//           })
//         ),
//       };
//     }
//
//     // Find user by email
//     const invitedUser = await db.query.authUsers.findFirst({
//       where: eq(authUsers.email, email.toLowerCase()),
//     });
//
//     if (!invitedUser) {
//       return {
//         success: false,
//         error: serializeError(
//           new AppError({
//             message: "User with this email not found",
//             code: "USER_NOT_FOUND",
//           })
//         ),
//       };
//     }
//
//     // Check if user is already a participant
//     const isAlreadyParticipant = petition.participants.some(
//       (p) => p.userId === invitedUser.id
//     );
//
//     if (isAlreadyParticipant) {
//       return {
//         success: false,
//         error: serializeError(
//           new AppError({
//             message: "User is already a participant in this petition",
//             code: "ALREADY_PARTICIPANT",
//           })
//         ),
//       };
//     }
//
//     // Add participant
//     await db.insert(petitionParticipants).values({
//       petitionId,
//       userId: invitedUser.id,
//       role: role as any,
//       isNotified: true, // Notify immediately
//       addedBy: user.id,
//     });
//
//     // Notify the invited user
//     await db.insert(petitionNotifications).values({
//       petitionId,
//       recipientUserId: invitedUser.id,
//       type: "invitation",
//       message: `You have been invited to participate in petition ${petition.referenceNumber} as ${formatRoleName(role)}`,
//     });
//
//     // Revalidate paths
//     revalidatePath(`/petitions/${petitionId}`);
//
//     return {
//       success: true,
//       data: true,
//     };
//   } catch (error) {
//     console.error("Error inviting participant:", error);
//     return {
//       success: false,
//       error: serializeError(error),
//     };
//   }
// }
//
// /**
//  * Mark notifications as read
//  */
// export async function markNotificationsAsRead(
//   notificationIds: string[]
// ): Promise<ActionResponse<boolean>> {
//   try {
//     // Get current user session
//     const sessionResult = await getSession();
//     if (!sessionResult.success || !sessionResult.data) {
//       return {
//         success: false,
//         error:
//           sessionResult.error || serializeError(new Error("No session data")),
//       };
//     }
//
//     const { user } = sessionResult.data;
//
//     // Get notifications
//     const notifications = await db.query.petitionNotifications.findMany({
//       where: and(
//         inArray(petitionNotifications.id, notificationIds),
//         eq(petitionNotifications.recipientUserId, user.id)
//       ),
//     });
//
//     if (notifications.length === 0) {
//       return {
//         success: false,
//         error: serializeError(
//           new AppError({
//             message: "No valid notifications found",
//             code: "NOTIFICATIONS_NOT_FOUND",
//           })
//         ),
//       };
//     }
//
//     // Update notifications
//     await db
//       .update(petitionNotifications)
//       .set({
//         isRead: true,
//       })
//       .where(
//         and(
//           inArray(petitionNotifications.id, notificationIds),
//           eq(petitionNotifications.recipientUserId, user.id)
//         )
//       );
//
//     // Revalidate paths
//     revalidatePath("/notifications");
//
//     return {
//       success: true,
//       data: true,
//     };
//   } catch (error) {
//     console.error("Error marking notifications as read:", error);
//     return {
//       success: false,
//       error: serializeError(error),
//     };
//   }
// }
//
// /**
//  * Get available petition types
//  */
// export async function getPetitionTypes(): Promise<
//   ActionResponse<(typeof petitionTypes.$inferSelect)[]>
// > {
//   try {
//     const types = await db.query.petitionTypes.findMany({
//       orderBy: [petitionTypes.name],
//     });
//
//     return {
//       success: true,
//       data: types,
//     };
//   } catch (error) {
//     console.error("Error fetching petition types:", error);
//     return {
//       success: false,
//       error: serializeError(error),
//     };
//   }
// }
//
// /**
//  * Get petitions for the current user
//  */
// export async function getUserPetitions(): Promise<
//   ActionResponse<(typeof petitions.$inferSelect)[]>
// > {
//   try {
//     // Get current user session
//     const sessionResult = await getSession();
//     if (!sessionResult.success || !sessionResult.data) {
//       return {
//         success: false,
//         error:
//           sessionResult.error || serializeError(new Error("No session data")),
//       };
//     }
//
//     const { user } = sessionResult.data;
//
//     // Query depends on user role
//     let userPetitions = [];
//
//     if (user.role === "student") {
//       // Get student profile
//       const studentProfile = await db.query.studentProfiles.findFirst({
//         where: eq(studentProfiles.authId, user.id),
//       });
//
//       if (!studentProfile || !studentProfile.studentId) {
//         return {
//           success: false,
//           error: serializeError(new Error("No student profile found")),
//         };
//       }
//
//       // Students see only their own petitions
//       userPetitions = await db.query.petitions.findMany({
//         where: eq(petitions.studentId, studentProfile.studentId),
//         orderBy: [desc(petitions.updatedAt)],
//         with: {
//           petitionType: true,
//           courses: true,
//           workflowSteps: {
//             where: eq(petitionWorkflowSteps.isCurrent, true),
//           },
//         },
//       });
//     } else {
//       // Staff see petitions where they are participants
//       const participations = await db.query.petitionParticipants.findMany({
//         where: eq(petitionParticipants.userId, user.id),
//         with: {
//           petition: {
//             with: {
//               petitionType: true,
//               courses: true,
//               workflowSteps: {
//                 where: eq(petitionWorkflowSteps.isCurrent, true),
//               },
//               student: true,
//             },
//           },
//         },
//       });
//
//       userPetitions = participations.map((p) => p.petition);
//     }
//
//     return {
//       success: true,
//       data: userPetitions,
//     };
//   } catch (error) {
//     console.error("Error fetching user petitions:", error);
//     return {
//       success: false,
//       error: serializeError(error),
//     };
//   }
// }
