"use client";

import { useState } from "react";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { UseFormReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Form, FormField } from "@/components/ui/form";

import { ExportHelpDialog } from "./export-help-dialog";
import { FileUpload } from "./file-upload";
import { ProcessingVisualization } from "./processing-visualization";

interface TranscriptImportFormProps {
  form: UseFormReturn<any>;
  onSubmit: (data: any) => Promise<void>;
  onBack: () => void;
  processingStages: string[];
  isProcessing: boolean;
  processingStage: number;
}

/**
 * Transcript import form component
 */
export function TranscriptImportForm({
  form,
  onSubmit,
  onBack,
  processingStages,
  isProcessing,
  processingStage,
}: TranscriptImportFormProps) {
  const [showWhyImportDialog, setShowWhyImportDialog] = useState(false);
  const [showHowToExportDialog, setShowHowToExportDialog] = useState(false);

  if (isProcessing) {
    return (
      <ProcessingVisualization
        processingStage={processingStage}
        stages={processingStages}
      />
    );
  }

  return (
    <Card className="w-full max-w-lg border-2 border-primary/10 shadow-lg">
      <CardHeader>
        <CardTitle className="text-center">Import Your Transcript</CardTitle>
        <CardDescription className="text-center">
          We'll automatically extract your courses and grades
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="transcript"
              render={({ field }) => (
                <FileUpload
                  field={field}
                  showWhyImportDialog={showWhyImportDialog}
                  setShowWhyImportDialog={setShowWhyImportDialog}
                />
              )}
            />

            {/* How to export transcript help */}
            <ExportHelpDialog
              open={showHowToExportDialog}
              onOpenChange={setShowHowToExportDialog}
            />

            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={onBack}>
                <ChevronLeft className="mr-2 size-4" />
                Back
              </Button>
              <Button type="submit" className="body2-medium rounded-[50px]">
                Import Transcript
                <ChevronRight className="ml-2 size-4" />
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
