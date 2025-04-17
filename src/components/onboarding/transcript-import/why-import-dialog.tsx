import { HelpCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface WhyImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog explaining the benefits of importing a transcript
 */
export function WhyImportDialog({ open, onOpenChange }: WhyImportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/*makeshift solution for redundant dialog trigger*/}
      {/*<DialogTrigger asChild>*/}
      {/*  <Button*/}
      {/*    variant="ghost"*/}
      {/*    size="sm"*/}
      {/*    type="button"*/}
      {/*    className="flex items-center gap-1.5 text-primary"*/}
      {/*  >*/}
      {/*    <HelpCircle className="size-4" />*/}
      {/*    Why import?*/}
      {/*  </Button>*/}
      {/*</DialogTrigger>*/}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Why Import Your Transcript?</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="body2-regular">
            Importing your transcript provides significant benefits for your
            Semesterize experience:
          </p>
          <ul className="ml-6 list-disc space-y-2">
            <li>Eliminates manual data entry and reduces errors</li>
            <li>Provides accurate, personalized degree requirements</li>
            <li>Automatically categorizes your courses</li>
            <li>Creates a verified academic history</li>
            <li>Enables smart course planning with prerequisite enforcement</li>
          </ul>
          <p className="body2-regular mt-4 text-muted-foreground">
            <strong className="text-foreground">Your privacy matters:</strong>{" "}
            Your transcript data is only used to build your academic profile and
            is not stored in its original form. We only extract the necessary
            information to provide you with personalized degree auditing.
          </p>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button>Got it</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
