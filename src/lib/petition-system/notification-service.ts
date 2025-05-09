// notification-service.ts
import { db } from "@/drizzle";
import { petitionNotifications } from "@/drizzle/schema/petition-system";
import {
  PetitionNotificationInput,
  PetitionNotificationRecord,
} from "@/drizzle/schema/petition-system/petition-notifications";
import { pusher } from "@/lib/pusher/pusher-server";

// Assuming drizzle-orm provides a Transaction type

/**
 * Send notification to a user and trigger real-time update
 */
export async function sendNotification(
  recipientUserId: string,
  petitionId: string,
  type: PetitionNotificationInput["type"],
  message: string,
  tx?: any // Optional transaction object for atomic operations
) {
  try {
    const dbOrTx = tx || db; // Use transaction if provided, else default db

    const [notification] = await dbOrTx
      .insert(petitionNotifications)
      .values({
        recipientUserId,
        petitionId,
        type,
        message,
        isRead: false,
      })
      .returning();

    const sequence = Date.now();

    const notificationData: Omit<PetitionNotificationRecord, "createdAt"> = {
      id: notification.id,
      petitionId,
      recipientUserId: notification.recipientUserId,
      type,
      message,
      sequence,
      isRead: notification.isRead || false,
    };

    await pusher.trigger(
      `private-user-${recipientUserId}`,
      "petition-notification",
      {
        ...notificationData,
        createdAt: notification.createdAt,
      }
    );

    return notification;
  } catch (error) {
    console.error("Error sending notification:", error);
    throw error;
  }
}

/**
 * Notify about petition status changes
 */
export async function notifyPetitionStatusChange(
  petitionId: string,
  referenceNumber: string,
  recipientId: string,
  newStatus: string,
  actorRole?: string,
  tx?: any // Optional transaction object
) {
  let message = "";
  let type = "status_change";

  // Customize message based on status
  switch (newStatus) {
    case "submitted":
      message = `Petition ${referenceNumber} has been submitted for review`;
      type = "petition_submitted";
      break;
    case "advisor_approved":
      message = `Petition ${referenceNumber} has been approved by Academic Advisor`;
      type = "petition_approved";
      break;
    case "advisor_rejected":
      message = `Petition ${referenceNumber} has been rejected by Academic Advisor`;
      type = "petition_rejected";
      break;
    case "hod_approved":
      message = `Petition ${referenceNumber} has been approved by Department Head`;
      type = "petition_approved";
      break;
    case "hod_rejected":
      message = `Petition ${referenceNumber} has been rejected by Department Head`;
      type = "petition_rejected";
      break;
    case "provost_approved":
      message = `Petition ${referenceNumber} has been approved by Provost`;
      type = "petition_approved";
      break;
    case "provost_rejected":
      message = `Petition ${referenceNumber} has been rejected by Provost`;
      type = "petition_rejected";
      break;
    case "completed":
      message = `Your petition ${referenceNumber} has been fully approved and implemented`;
      type = "petition_completed";
      break;
    default:
      message = `Petition ${referenceNumber} status has changed to ${newStatus}`;
  }

  return sendNotification(
    recipientId,
    petitionId,
    type as PetitionNotificationInput["type"],
    message,
    tx // Pass transaction if provided
  );
}

/**
 * Notify about new messages in petitions
 */
export async function notifyNewMessage(
  petitionId: string,
  referenceNumber: string,
  recipientId: string,
  isAdminOnly: boolean,
  tx?: any // Optional transaction object
) {
  const type = "new_message";
  const message = isAdminOnly
    ? `New admin message in petition ${referenceNumber}`
    : `New message in petition ${referenceNumber}`;

  return sendNotification(
    recipientId,
    petitionId,
    type as PetitionNotificationInput["type"],
    message,
    tx // Pass transaction if provided
  );
}
