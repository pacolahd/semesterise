"use client";

import { useState } from "react";
import React from "react";

import { AlertCircle, FileText, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface FileUploadProps {
  field: any;
  onFileChange?: (file: File) => void;
  showWhyImportDialog: () => void;
  showHowToExportDialog: () => void;
}

export function FileUpload({
  field,
  onFileChange,
  showWhyImportDialog,
  showHowToExportDialog,
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Helper to validate file
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return { valid: false, error: "File size exceeds the 10MB limit" };
    }

    // Validate file type
    const validTypes = [
      "text/html",
      "application/x-mimearchive",
      "application/pdf",
      "multipart/related", // Added to support MHTML
    ];

    // Get extension
    const ext = file.name.split(".").pop()?.toLowerCase();
    const isValidExtension = ext === "html" || ext === "mhtml" || ext === "pdf";

    if (!validTypes.includes(file.type) && !isValidExtension) {
      return {
        valid: false,
        error: "Please upload an HTML, MHTML, or PDF file exported from CAMU",
      };
    }

    return { valid: true };
  };

  // Updated file change handler that properly works with React Hook Form
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target || !e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const validation = validateFile(file);

    if (!validation.valid) {
      setError(validation.error || "Invalid file");
      toast.error(validation.error || "Invalid file");
      return;
    }

    // Update UI state
    setSelectedFile(file);
    setError(null);

    // Let React Hook Form know about the value change
    if (field && typeof field.onChange === "function") {
      // This is safer than creating a synthetic event
      field.onChange(e);
    }

    // Notify parent
    if (onFileChange) {
      onFileChange(file);
    }

    // Display selected filename
    toast.info(`Selected: ${file.name}`);
  };

  // Handle drag events
  const handleDrag = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle file drop
  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (
      !e.dataTransfer ||
      !e.dataTransfer.files ||
      e.dataTransfer.files.length === 0
    ) {
      return;
    }

    const file = e.dataTransfer.files[0];
    const validation = validateFile(file);

    if (!validation.valid) {
      setError(validation.error || "Invalid file");
      toast.error(validation.error || "Invalid file");
      return;
    }

    // Update UI state
    setSelectedFile(file);
    setError(null);

    // Create a proper file list for the input
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    // Update the form field directly - without creating synthetic events
    if (field && typeof field.onChange === "function") {
      // Just pass the FileList to the field's onChange
      field.onChange(dataTransfer.files);
    }

    // Notify parent
    if (onFileChange) {
      onFileChange(file);
    }

    toast.info(`Selected: ${file.name}`);
  };

  // Handle file removal/clear
  const handleClearFile = () => {
    setSelectedFile(null);

    // Better way to clear the field value
    if (field && typeof field.onChange === "function") {
      // Clear by passing an empty value that matches what React Hook Form expects
      field.onChange(undefined);
    }
  };

  return (
    <FormItem>
      <FormLabel className="body2-medium">Transcript File</FormLabel>
      <FormControl>
        <div className="flex w-full flex-col items-center justify-center">
          {!selectedFile ? (
            <label
              htmlFor="dropzone-file"
              className={`flex h-48 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : error
                    ? "border-destructive/50 bg-destructive/5"
                    : "border-primary/20 bg-surface-50 hover:bg-surface-100 dark:hover:bg-surface-800"
              }`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center justify-center pb-6 pt-5">
                {error ? (
                  <AlertCircle className="mb-3 size-10 text-destructive" />
                ) : (
                  <Upload
                    className={`mb-3 size-10 ${dragActive ? "text-primary-600" : "text-primary"}`}
                  />
                )}
                <p className="mb-2 text-center text-sm">
                  <span className="font-medium">Click to upload</span> or drag
                  and drop
                </p>
                <p className="text-center text-xs text-muted-foreground">
                  MHTML, HTML, or PDF file exported from CAMU
                </p>
                {error && (
                  <p className="mt-2 text-center text-xs text-destructive">
                    {error}
                  </p>
                )}
              </div>
              {/* Don't use {...field} to prevent conflicts - just use onChange */}
              <input
                id="dropzone-file"
                type="file"
                className="hidden"
                accept=".html,.mhtml,.pdf,application/x-mimearchive,text/html,application/pdf,multipart/related"
                onChange={handleFileChange}
                name={field.name}
                ref={field.ref}
              />
            </label>
          ) : (
            <div className="flex h-48 w-full flex-col items-center justify-center rounded-lg border-2 border-primary/30 bg-primary/5 p-4">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <p className="mb-1 break-all text-center font-medium">
                {selectedFile.name}
              </p>
              <p className="text-center text-sm text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-4"
                onClick={handleClearFile}
                type="button"
              >
                Change File
              </Button>
            </div>
          )}
        </div>
      </FormControl>
      <div className="mt-2 flex items-center justify-between">
        <FormDescription className="flex gap-2">
          <span>
            Export your transcript from CAMU as an HTML, MHTML, or PDF file
          </span>
          <Button
            variant="link"
            type="button"
            className="h-auto p-0 text-xs"
            onClick={showHowToExportDialog}
          >
            How?
          </Button>
        </FormDescription>

        {/* Why Import Button */}
        <Button
          variant="ghost"
          size="sm"
          type="button"
          className="flex items-center gap-1.5 text-primary"
          onClick={showWhyImportDialog}
        >
          <AlertCircle className="size-4" />
          Why import?
        </Button>
      </div>
      <FormMessage />
    </FormItem>
  );
}
