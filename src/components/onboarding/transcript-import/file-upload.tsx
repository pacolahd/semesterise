"use client";

import { ChangeEvent, DragEvent, useState } from "react";

import { FileText, Upload } from "lucide-react";
import { ControllerRenderProps } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { WhyImportDialog } from "./why-import-dialog";

interface FileUploadProps {
  field: ControllerRenderProps<any, "transcript">;
  showWhyImportDialog: boolean;
  setShowWhyImportDialog: (show: boolean) => void;
}

/**
 * File upload component for transcript import with drag and drop support
 */
export function FileUpload({
  field: { onChange, value, ...field },
  showWhyImportDialog,
  setShowWhyImportDialog,
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);

  // Handle file selection from input
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.length) {
      onChange(files);
      // Display selected filename
      toast.info(`Selected: ${files[0].name}`);
    }
  };

  // Handle drag events
  const handleDrag = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle file drop
  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Check if the file type is acceptable
      const file = e.dataTransfer.files[0];
      const isValidType =
        file.type === "application/x-mimearchive" ||
        file.type === "text/html" ||
        file.name.endsWith(".mhtml") ||
        file.name.endsWith(".html");

      if (isValidType) {
        onChange(e.dataTransfer.files);
        toast.info(`Selected: ${file.name}`);
      } else {
        toast.error("Please upload an HTML or MHTML file.");
      }
    }
  };

  return (
    <FormItem>
      <FormLabel className="body2-medium">Transcript File</FormLabel>
      <FormControl>
        <div className="flex w-full flex-col items-center justify-center">
          {!value || value.length === 0 ? (
            <label
              htmlFor="dropzone-file"
              className={`flex h-48 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-primary/20 bg-surface-50 hover:bg-surface-100 dark:hover:bg-surface-800"
              }`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center justify-center pb-6 pt-5">
                <Upload
                  className={`mb-3 size-10 ${dragActive ? "text-primary-600" : "text-primary"}`}
                />
                <p className="mb-2 text-center text-sm">
                  <span className="font-medium">Click to upload</span> or drag
                  and drop
                </p>
                <p className="text-center text-xs text-muted-foreground">
                  MHTML or HTML file exported from CAMU
                </p>
              </div>
              <input
                id="dropzone-file"
                type="file"
                className="hidden"
                accept=".html,.mhtml,application/x-mimearchive,text/html"
                onChange={handleFileChange}
                {...field}
              />
            </label>
          ) : (
            <div className="flex h-48 w-full flex-col items-center justify-center rounded-lg border-2 border-primary/30 bg-primary/5 p-4">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <p className="mb-1 break-all text-center font-medium">
                {value[0].name}
              </p>
              <p className="text-center text-sm text-muted-foreground">
                {(value[0].size / 1024).toFixed(1)} KB
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-4"
                onClick={() => onChange(null)}
                type="button"
              >
                Change File
              </Button>
            </div>
          )}
        </div>
      </FormControl>
      <div className="mt-2 flex items-center justify-between">
        <FormDescription>
          Export your transcript from CAMU as an HTML or MHTML file
        </FormDescription>

        {/* Why Import Button */}
        <WhyImportDialog
          open={showWhyImportDialog}
          onOpenChange={setShowWhyImportDialog}
        />
      </div>
      <FormMessage />
    </FormItem>
  );
}
