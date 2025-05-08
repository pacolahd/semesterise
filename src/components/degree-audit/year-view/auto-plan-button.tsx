"use client";

import { useState } from "react";

import { Loader2, Wand2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useGenerateAutomaticPlan } from "@/lib/academic-plan/academic-plan-hooks";
import { getCreditLimit } from "@/lib/academic-plan/transaction-utils";
import { useAuthStore } from "@/lib/auth/auth-store";

// src/components/degree-audit/year-view/auto-plan-button.tsx

export function AutoPlanButton() {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [balanceCredits, setBalanceCredits] = useState(true);

  //TODO: Add a way to get student's major code
  const MAX_CREDITS = getCreditLimit("CS");
  const generatePlanMutation = useGenerateAutomaticPlan();

  const handleGeneratePlan = async () => {
    if (!user?.id) return;

    try {
      await generatePlanMutation.mutateAsync({
        authId: user.id,
        options: {
          balanceCredits,
        },
      });
      setOpen(false);
    } catch (error) {
      console.error("Error generating plan:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Wand2 className="h-4 w-4" />
          Auto-Plan
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Generate Automatic Plan</DialogTitle>
          <DialogDescription>
            This will create an optimal degree plan based on your remaining
            requirements.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <Alert>
            <AlertDescription>
              It will replace all your planned courses with a new automatically
              generated plan. Completed and failed courses will not be affected.
            </AlertDescription>
          </Alert>
          <p className="text-sm">
            Your plan will aim for a balanced credit load each semester
            <span className="text-red-500 font-bold">
              {" "}
              (max {MAX_CREDITS} credits)
            </span>
          </p>

          {/*<div className="flex items-center justify-between space-y-2">*/}
          {/*  <Label htmlFor="balance-credits">*/}
          {/*    Balance credit load across semesters*/}
          {/*  </Label>*/}
          {/*  <Switch*/}
          {/*    id="balance-credits"*/}
          {/*    checked={balanceCredits}*/}
          {/*    onCheckedChange={setBalanceCredits}*/}
          {/*  />*/}
          {/*</div>*/}
          {/*<p className="text-xs text-muted-foreground mt-2">*/}
          {/*  {balanceCredits*/}
          {/*    ? "Your plan will aim for a balanced credit load each semester (max 5 credits)."*/}
          {/*    : "Your plan will prioritize placing courses as early as possible, which may result in some semesters having more than 5 credits."}*/}
          {/*</p>*/}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleGeneratePlan}
            disabled={generatePlanMutation.isPending || !user?.id}
          >
            {generatePlanMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin " />
                Generating...
              </>
            ) : (
              "Generate Plan"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
