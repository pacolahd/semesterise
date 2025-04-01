// src/lib/auth/petition-authorization.ts
import { and, eq } from "drizzle-orm";

import { db } from "@/drizzle";
import { petitionParticipants } from "@/drizzle/schema";

// TODO: Update petition specific authorization logic

// Check the specific role of a user in a petition, regardless of their system role
export async function getUserPetitionRole(
  userId: string,
  petitionId: string
): Promise<string | null> {
  const participant = await db.query.petitionParticipants.findFirst({
    where: and(
      eq(petitionParticipants.petitionId, petitionId),
      eq(petitionParticipants.userId, userId)
    ),
  });

  return participant?.role || null;
}

// Check if user has permission for specific petition action based on their role in this petition
export async function canPerformPetitionAction(
  userId: string,
  petitionId: string,
  action: "view" | "approve" | "reject" | "implement" | "comment" | "update"
): Promise<boolean> {
  const petitionRole = await getUserPetitionRole(userId, petitionId);

  if (!petitionRole) return false;

  // Define which actions are allowed for each petition role
  const allowedActions: Record<string, string[]> = {
    student: ["view", "update", "comment"],
    academic_advisor: ["view", "approve", "reject", "comment"],
    hod: ["view", "approve", "reject", "comment"],
    provost: ["view", "approve", "reject", "comment"],
    registry: ["view", "implement", "comment"],
    invited_approver: ["view", "approve", "reject", "comment"],
    observer: ["view", "comment"], // Observers can view and comment but not approve/reject
  };

  return allowedActions[petitionRole]?.includes(action) || false;
}

// Check if a user can view a specific petition
export async function canViewPetition(
  userId: string,
  petitionId: string
): Promise<boolean> {
  return canPerformPetitionAction(userId, petitionId, "view");
}
