// src/components/petition-system/PetitionTabs.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Loader2, PlusIcon, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserPetitions } from "@/lib/petition-system/petition-hooks";

import { EmptyPetitionState } from "./empty-petition-state";
import { PetitionListItem } from "./petition-list-item";

// src/components/petition-system/PetitionTabs.tsx

// src/components/petition-system/PetitionTabs.tsx

export const PetitionTabs = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("my-petitions");
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: petitions,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useUserPetitions();

  // Filter petitions based on tab and search
  const getFilteredPetitions = () => {
    const activePetitions =
      petitions?.filter(
        (p) =>
          p.status !== "draft" &&
          p.status !== "completed" &&
          p.status !== "cancelled"
      ) || [];

    const completedPetitions =
      petitions?.filter(
        (p) => p.status === "completed" || p.status === "cancelled"
      ) || [];

    const draftPetitions = petitions?.filter((p) => p.status === "draft") || [];

    const applySearch = (items) => {
      if (!searchQuery) return items;
      return items.filter(
        (p) =>
          p.typeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.referenceNumber
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          p.title?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    };

    return {
      "my-petitions": applySearch(activePetitions),
      "completed-petitions": applySearch(completedPetitions),
      drafts: applySearch(draftPetitions),
    };
  };

  const filteredPetitions = getFilteredPetitions();

  const handleNewPetition = () => {
    router.push("/petitions/new");
  };

  const handleRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Error loading petitions: {error.message}
      </div>
    );
  }

  const noResults = () => (
    <div className="flex flex-col items-center justify-center p-8">
      <p className="text-muted-foreground">No petitions found</p>
    </div>
  );

  return (
    <div className="w-full space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="my-petitions">My petitions</TabsTrigger>
          <TabsTrigger value="completed-petitions">
            Completed petitions
          </TabsTrigger>
          <TabsTrigger value="drafts">Drafts</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex gap-2 items-center">
              {activeTab === "my-petitions" && "My Petitions"}
              {activeTab === "completed-petitions" && "Completed Petitions"}
              {activeTab === "drafts" && "Drafts"}

              {filteredPetitions[activeTab].length > 0 && (
                <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-1 rounded-full">
                  {filteredPetitions[activeTab].length}
                </span>
              )}
            </h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`}
                />
              </Button>
              <Button
                onClick={handleNewPetition}
                className="flex items-center gap-2"
              >
                <PlusIcon className="h-4 w-4" />
                New petition
              </Button>
            </div>
          </div>

          <div className="mb-4">
            <Input
              type="search"
              placeholder="Search by category"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <TabsContent value="my-petitions" className="w-full">
            {filteredPetitions["my-petitions"].length === 0 ? (
              noResults()
            ) : (
              <div className="space-y-4">
                {filteredPetitions["my-petitions"].map((petition) => (
                  <PetitionListItem key={petition.id} petition={petition} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed-petitions" className="w-full">
            {filteredPetitions["completed-petitions"].length === 0 ? (
              noResults()
            ) : (
              <div className="space-y-4">
                {filteredPetitions["completed-petitions"].map((petition) => (
                  <PetitionListItem key={petition.id} petition={petition} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="drafts" className="w-full">
            {filteredPetitions["drafts"].length === 0 ? (
              noResults()
            ) : (
              <div className="space-y-4">
                {filteredPetitions["drafts"].map((petition) => (
                  <PetitionListItem key={petition.id} petition={petition} />
                ))}
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};
