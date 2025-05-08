// src/app/api/uploadthing/route.ts
import { createRouteHandler } from "uploadthing/next";
import { UTApi } from "uploadthing/server";

import { ourFileRouter } from "./core";

const utapi = new UTApi();

// Export route handlers for UploadThing
export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
  // Apply an (optional) custom config:
  // config: { ... },
});

// Add DELETE handler for file deletion
export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const fileKey = url.searchParams.get("fileKey");

  if (!fileKey) {
    return new Response("Missing fileKey", { status: 400 });
  }

  try {
    await utapi.deleteFiles(fileKey);
    return new Response("File deleted", { status: 200 });
  } catch (error) {
    console.error("Error deleting file:", error);
    return new Response("Failed to delete file", { status: 500 });
  }
}
