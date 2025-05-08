// src/app/api/uploadthing/core.ts
import { type FileRouter, createUploadthing } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

import { getSession } from "@/lib/auth/auth-actions";

const f = createUploadthing();

export const ourFileRouter = {
  // Route for petition documents
  petitionDocument: f({
    // Accepted MIME types - PDF, images, and common document formats
    image: { maxFileSize: "4MB", maxFileCount: 4 },
    pdf: { maxFileSize: "16MB", maxFileCount: 4 },
    // Can add other document types as needed
  })
    // Set permissions - only signed-in users can upload
    .middleware(async () => {
      // Check authentication
      const sessionResult = await getSession();
      if (!sessionResult.success || !sessionResult.data) {
        throw new UploadThingError("Unauthorized");
      }

      // Return user info for attribution
      return { userId: sessionResult.data.user.id };
    })
    // Define what happens after successful upload
    .onUploadComplete(async ({ metadata, file }) => {
      // Return file information to client
      return {
        fileUrl: file.url,
        fileKey: file.key,
        fileName: file.name,
        userId: metadata.userId,
      };
    }),

  // Route specifically for signed petition documents
  signedPetition: f({
    // Only PDFs for signed petitions
    pdf: { maxFileSize: "16MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const sessionResult = await getSession();
      if (!sessionResult.success || !sessionResult.data) {
        throw new UploadThingError("Unauthorized");
      }
      return { userId: sessionResult.data.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        fileUrl: file.url,
        fileKey: file.key,
        fileName: file.name,
        userId: metadata.userId,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
