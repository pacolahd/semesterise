import Image from "next/image";

import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ExportHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog showing how to export a transcript from CAMU
 */
export function ExportHelpDialog({
  open,
  onOpenChange,
}: ExportHelpDialogProps) {
  return (
    <>
      {/* Clickable card to open dialog */}
      <Card
        className="cursor-pointer transition-colors hover:bg-surface-100 dark:hover:bg-surface-800"
        onClick={() => onOpenChange(true)}
      >
        <CardHeader className="p-4">
          <div className="flex items-center space-x-3">
            <AlertCircle className="size-5 text-amber-500" />
            <CardTitle className="text-base">
              How to export your transcript
            </CardTitle>
          </div>
        </CardHeader>
      </Card>

      {/* Dialog with export instructions */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader className="  bg-background pb-2 pt-4">
            <DialogTitle>How to Export Your Transcript from CAMU</DialogTitle>
            <DialogDescription>
              Follow these steps to export your transcript from CAMU and import
              it into Semesterize
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-8 py-4">
            {/* Step 1 */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-8">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">
                  Step 1: Save the transcript page
                </h3>
                <p className="text-sm text-muted-foreground">
                  Open CAMU and navigate to your transcript page. Right-click
                  anywhere on the page and select "Save as".
                </p>
              </div>
              <div className="relative aspect-video h-auto max-h-[200px] w-full overflow-hidden rounded-md border">
                <Image
                  src="/images/transcript-import-step1.png"
                  alt="Save transcript page"
                  fill
                  className="object-contain"
                />
              </div>
            </div>

            {/* Step 2 */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-8">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">
                  Step 2: Choose the correct file type
                </h3>
                <p className="text-sm text-muted-foreground">
                  Select either "Webpage, Single File (.mhtml)" or "Webpage,
                  Complete (.html)" from the "Save as type" dropdown. Note the
                  folder where the file will be saved.
                </p>
              </div>
              <div className="relative aspect-video h-auto max-h-[200px] w-full overflow-hidden rounded-md border">
                <Image
                  src="/images/transcript-import-step2.png"
                  alt="Select file type"
                  fill
                  className="object-contain"
                />
              </div>
            </div>

            {/* Step 3 */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-8">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">
                  Step 3: Verify your transcript
                </h3>
                <p className="text-sm text-muted-foreground">
                  Find the saved file in your Downloads folder (or the folder
                  you selected) and open it to verify your complete transcript
                  is visible before uploading it to Semesterize.
                </p>
              </div>
              <div className="relative aspect-video h-auto max-h-[200px] w-full overflow-hidden rounded-md border">
                <Image
                  src="/images/transcript-import-step3.png"
                  alt="Verify transcript"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          </div>

          {/* Always visible footer with button */}
          <DialogFooter className="sticky bottom-0  pt-4">
            <DialogClose asChild>
              <Button>Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
