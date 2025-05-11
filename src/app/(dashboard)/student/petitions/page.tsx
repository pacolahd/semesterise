// src/app/(dashboard)/petitions/page.tsx
"use client";

import { EmptyPetitionState } from "@/components/petition-system/empty-petition-state";
import { PetitionTabs } from "@/components/petition-system/petition-tabs";
import { useUserPetitions } from "@/lib/petition-system/petition-hooks";

// src/app/(dashboard)/petitions/page.tsx

export default function PetitionsPage() {
  const { data: petitions, isLoading } = useUserPetitions();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Show empty state if there are no petitions at all
  if (!petitions || petitions.length === 0) {
    return <EmptyPetitionState />;
  }

  // Otherwise show the tabs with petitions
  return <PetitionTabs />;
}
