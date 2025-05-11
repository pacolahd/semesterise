// src/components/petition-system/EmptyPetitionState.tsx
"use client";

import { useRouter } from "next/navigation";

import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

// src/components/petition-system/EmptyPetitionState.tsx

// src/components/petition-system/EmptyPetitionState.tsx

export const EmptyPetitionState = () => {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow-sm">
      <div className="w-full max-w-md space-y-6">
        <div className="w-full h-20 bg-gray-100 rounded-md mb-6"></div>
        <div className="text-center space-y-4">
          <h3 className="text-base font-medium text-gray-900">
            No Petitions Yet!
          </h3>
          <p className="text-sm text-gray-500">
            You haven't submitted any petitions. Need to request a grade review,
            course withdrawal, or special approval?
          </p>
          <Button
            onClick={() => router.push("/student/petitions/new")}
            className="flex items-center justify-center gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            Create a new petition
          </Button>
        </div>
      </div>
    </div>
  );
};
