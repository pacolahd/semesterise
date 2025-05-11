// src/components/petition-system/PetitionListItem.tsx
"use client";

import Link from "next/link";

import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { PetitionRecord } from "@/drizzle/schema/petition-system/petitions";

// src/components/petition-system/PetitionListItem.tsx

export interface PetitionItemProps {
  petition: PetitionRecord & {
    typeName?: string; // From the joined petitionType
    createdByName?: string; // From the joined user info
  };
}

export const PetitionListItem = ({ petition }: PetitionItemProps) => {
  const statusColors = {
    draft: "bg-gray-100 text-gray-800",
    submitted: "bg-blue-100 text-blue-800",
    advisor_approved: "bg-green-100 text-green-800",
    advisor_rejected: "bg-red-100 text-red-800",
    hod_approved: "bg-green-100 text-green-800",
    hod_rejected: "bg-red-100 text-red-800",
    provost_approved: "bg-green-100 text-green-800",
    provost_rejected: "bg-red-100 text-red-800",
    registry_processing: "bg-purple-100 text-purple-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-gray-100 text-gray-800",
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    return format(new Date(date), "d MMMM yyyy h:mma");
  };

  return (
    <Link href={`/petitions/${petition.id}`}>
      <div className="border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
        <div className="p-4">
          <div className="flex flex-col gap-1">
            <div className="text-sm text-muted-foreground">Category</div>
            <div className="font-medium">
              {petition.typeName || "Unknown Type"}
            </div>
          </div>

          <div className="flex flex-col gap-1 mt-2">
            <div className="text-sm text-muted-foreground">Created on</div>
            <div>{formatDate(petition.createdAt)}</div>
          </div>

          <div className="mt-2">
            <Badge className={statusColors[petition.status]}>
              {petition.status.replace("_", " ").toUpperCase()}
            </Badge>
          </div>
        </div>

        <div className="bg-blue-50 p-3 flex justify-between items-center text-sm border-t">
          <div>Ref: {petition.referenceNumber}</div>
          <div>Last updated: {formatDate(petition.updatedAt)}</div>
        </div>
      </div>
    </Link>
  );
};
