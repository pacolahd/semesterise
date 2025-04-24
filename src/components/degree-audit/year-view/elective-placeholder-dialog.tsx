// src/components/degree-audit/year-view/elective-placeholder-dialog.tsx
"use client";

import { useEffect, useState } from "react";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAddPlaceholderElective,
  useAvailableElectiveCategories,
} from "@/lib/academic-plan/academic-plan-hooks";
import { useAuthStore } from "@/lib/auth/auth-store";

// src/components/degree-audit/year-view/elective-placeholder-dialog.tsx

interface ElectivePlaceholderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  semester: number;
  onSuccess: () => Promise<void>;
}

export function ElectivePlaceholderDialog({
  open,
  onOpenChange,
  year,
  semester,
  onSuccess,
}: ElectivePlaceholderDialogProps) {
  const { user } = useAuthStore();
  const [title, setTitle] = useState("Elective Course");
  const [credits, setCredits] = useState("1");
  const [category, setCategory] = useState("Non-Major Electives");

  // Fetch available elective categories
  const { data: categoryOptions, isLoading: isLoadingCategories } =
    useAvailableElectiveCategories(user?.id);

  const addPlaceholderMutation = useAddPlaceholderElective();

  // Convert semester number to name for display
  const semesterName =
    semester === 1 ? "Fall" : semester === 2 ? "Spring" : "Summer";

  // Update title based on selected category
  useEffect(() => {
    if (category) {
      setTitle(`${category} Elective`);
    }
  }, [category]);

  const handleAddPlaceholder = async () => {
    if (!user?.id) return;

    try {
      await addPlaceholderMutation.mutateAsync({
        authId: user.id,
        title,
        credits: parseFloat(credits),
        year,
        semester,
        category,
      });

      onOpenChange(false);
      await onSuccess();
    } catch (error) {
      console.error("Error adding placeholder:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Add Elective Placeholder to {semesterName} Year {year}
          </DialogTitle>
          <DialogDescription>
            Add an elective placeholder that you can replace with a specific
            course later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="category">Elective Category</Label>
            {isLoadingCategories ? (
              <div className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Loading categories...</span>
              </div>
            ) : (
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions &&
                    categoryOptions.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Elective Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Major Elective, Humanities Elective"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="credits">Credits</Label>
            <Input
              id="credits"
              type="number"
              min="0.5"
              max="5"
              step="0.5"
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAddPlaceholder}
            disabled={addPlaceholderMutation.isPending}
          >
            {addPlaceholderMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              "Add Placeholder"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
