// src/lib/petition-system/petition-upload-hook.ts
import { useState } from "react";

import { generateClientDropzoneAccept } from "uploadthing/client";

import {
  addPetitionDocument,
  updatePetitionDraft,
} from "@/lib/petition-system/petition-actions";

import { useUploadThing } from "./uploadthing";

export function usePetitionUpload(petitionId: string) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const { startUpload, routeConfig } = useUploadThing("petitionDocument", {
    onClientUploadComplete: async (files) => {
      setIsUploading(false);
      setProgress(100);
      if (files && files.length > 0) {
        for (const file of files) {
          await addPetitionDocument({
            petitionId,
            documentType: "supporting_document",
            fileKey: file.key,
            fileUrl: file.ufsUrl,
            fileName: file.name,
            uploadedBy: file.serverData.userId,
          });
        }
      }
    },
    onUploadProgress: (progress) => {
      setProgress(progress);
    },
    onUploadError: (error) => {
      setIsUploading(false);
      setError(error.message);
    },
  });

  const { startUpload: startSignedUpload } = useUploadThing("signedPetition", {
    onClientUploadComplete: async (files) => {
      setIsUploading(false);
      setProgress(100);
      if (files && files.length > 0) {
        const file = files[0]; // Only one file allowed
        await addPetitionDocument({
          petitionId,
          documentType: "signed_petition",
          fileKey: file.key,
          fileUrl: file.ufsUrl,
          fileName: file.name,
          uploadedBy: file.serverData.userId,
        });
        await updatePetitionDraft(petitionId, {
          signedDocumentUrl: file.ufsUrl,
        });
      }
    },
    onUploadProgress: (progress) => {
      setProgress(progress);
    },
    onUploadError: (error) => {
      setIsUploading(false);
      setError(error.message);
    },
  });

  const acceptedTypes = routeConfig
    ? generateClientDropzoneAccept(Object.keys(routeConfig))
    : {};

  const uploadFiles = async (
    files: File[],
    documentType: "supporting_document" | "signed_petition"
  ) => {
    setIsUploading(true);
    setProgress(0);
    setError(null);
    try {
      if (documentType === "signed_petition") {
        await startSignedUpload(files);
      } else {
        await startUpload(files);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setIsUploading(false);
    }
  };

  return {
    uploadFiles,
    isUploading,
    progress,
    error,
    acceptedTypes,
  };
}
