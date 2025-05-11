// src/components/petition-system/PetitionCategorySelect.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreatePetitionDraft,
  usePetitionTypes,
} from "@/lib/petition-system/petition-hooks";

// src/components/petition-system/PetitionCategorySelect.tsx

// src/components/petition-system/PetitionCategorySelect.tsx

// src/components/petition-system/PetitionCategorySelect.tsx

// src/components/petition-system/PetitionCategorySelect.tsx

// src/components/petition-system/PetitionCategorySelect.tsx

// src/components/petition-system/PetitionCategorySelect.tsx

// src/components/petition-system/PetitionCategorySelect.tsx

// src/components/petition-system/PetitionCategorySelect.tsx

// Create a form schema
const formSchema = z.object({
  petitionTypeId: z.string().uuid({
    message: "Please select a petition type",
  }),
});

type FormValues = z.infer<typeof formSchema>;

export const PetitionCategorySelect = () => {
  const router = useRouter();
  const { data: petitionTypes, isLoading } = usePetitionTypes();
  const createPetitionMutation = useCreatePetitionDraft();
  const [open, setOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      petitionTypeId: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      // Find the selected petition type to use its name for the title
      const selectedType = petitionTypes?.find(
        (t) => t.id === data.petitionTypeId
      );

      if (!selectedType) {
        console.error("Selected petition type not found");
        return;
      }

      const result = await createPetitionMutation.mutateAsync({
        petitionTypeId: data.petitionTypeId,
        title: `${selectedType.name} Request`, // Use the type name in the title
      });

      if (result.data?.id) {
        router.push(`/student/petitions/${result.data?.id}/edit`);
      }
    } catch (error) {
      console.error("Failed to create petition draft:", error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button
        variant="ghost"
        className="flex items-center gap-2"
        onClick={() => router.back()}
      >
        <ArrowLeft className="h-4 w-4" />
        Submit New Petition
      </Button>

      <Alert className="bg-yellow-50 border-yellow-200 text-yellow-800">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Please note that your petition may not be granted. Kindly read the
          petition section of the Student Handbook for more information.
        </AlertDescription>
      </Alert>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="petitionTypeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select
                  open={open}
                  onOpenChange={setOpen}
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    setOpen(false);
                  }}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {isLoading ? (
                      <div className="flex justify-center p-2">
                        <AlertCircle className="h-4 w-4 animate-pulse" />
                      </div>
                    ) : (
                      petitionTypes?.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={
              isLoading ||
              createPetitionMutation.isPending ||
              !form.watch("petitionTypeId")
            }
            className="w-full"
          >
            {createPetitionMutation.isPending ? "Creating..." : "Continue"}
          </Button>
        </form>
      </Form>
    </div>
  );
};
