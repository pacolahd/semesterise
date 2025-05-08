// src/lib/petition-system/petition-hooks.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PetitionCourseRecord } from "@/drizzle/schema/petition-system/petition-courses";
import { PetitionMessageInput } from "@/drizzle/schema/petition-system/petition-messages";
import { handleActionResponse } from "@/lib/errors/action-response-handler";
import {
  addPetitionCourse,
  addPetitionDocument,
  addPetitionMessage,
  createPetitionDraft,
  getPetitionById,
  getPetitionMessages,
  getPetitionTypes,
  getUserNotifications,
  getUserPetitions,
  inviteParticipant,
  markNotificationsAsRead,
  progressPetitionWorkflow,
  removePetitionCourse,
  submitPetition,
  updatePetitionDraft,
} from "@/lib/petition-system/petition-actions";

// Query hooks for fetching data
export function usePetitionTypes() {
  return useQuery({
    queryKey: ["petitionTypes"],
    queryFn: async () => {
      const response = await getPetitionTypes();
      return handleActionResponse(response);
    },
  });
}

export function useUserPetitions() {
  return useQuery({
    queryKey: ["userPetitions"],
    queryFn: async () => {
      const response = await getUserPetitions();
      return handleActionResponse(response);
    },
  });
}

export function usePetition(petitionId: string) {
  return useQuery({
    queryKey: ["petition", petitionId],
    queryFn: async () => {
      const response = await getPetitionById(petitionId);
      return handleActionResponse(response);
    },
    enabled: !!petitionId,
  });
}

export function usePetitionMessages(petitionId: string) {
  return useQuery({
    queryKey: ["petitionMessages", petitionId],
    queryFn: async () => {
      const response = await getPetitionMessages(petitionId);
      return handleActionResponse(response);
    },
    enabled: !!petitionId,
  });
}

export function useUserNotifications() {
  return useQuery({
    queryKey: ["userNotifications"],
    queryFn: async () => {
      const response = await getUserNotifications();
      return handleActionResponse(response);
    },
  });
}

// Mutation hooks for making changes
export function useCreatePetitionDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPetitionDraft,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userPetitions"] });
    },
  });
}

export function useUpdatePetitionDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await updatePetitionDraft(id, data);
      return handleActionResponse(response);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["petition", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["userPetitions"] });
    },
  });
}

export function useAddPetitionCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: PetitionCourseRecord) => {
      const response = await addPetitionCourse(data);
      return handleActionResponse(response);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["petition", variables.petitionId],
      });
    },
  });
}

export function useRemovePetitionCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (courseId: string) => {
      const response = await removePetitionCourse(courseId);
      return handleActionResponse(response);
    },
    onSuccess: () => {
      // We need to invalidate all petitions since we don't know which one was updated
      queryClient.invalidateQueries({ queryKey: ["petition"] });
    },
  });
}

export function useSubmitPetition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (petitionId: string) => {
      const response = await submitPetition(petitionId);
      return handleActionResponse(response);
    },
    onSuccess: (_, petitionId) => {
      queryClient.invalidateQueries({ queryKey: ["petition", petitionId] });
      queryClient.invalidateQueries({ queryKey: ["userPetitions"] });
    },
  });
}

export function useAddPetitionMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: PetitionMessageInput) => {
      const response = await addPetitionMessage(data);

      return handleActionResponse(response);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["petitionMessages", variables.petitionId],
      });
    },
  });
}

export function useProgressWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      petitionId,
      action,
      comments,
    }: {
      petitionId: string;
      action: "approve" | "reject";
      comments?: string;
    }) => {
      const response = await progressPetitionWorkflow(
        petitionId,
        action,
        comments
      );
      return handleActionResponse(response);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["petition", variables.petitionId],
      });
      queryClient.invalidateQueries({ queryKey: ["userPetitions"] });
      // Also invalidate user notifications
      queryClient.invalidateQueries({ queryKey: ["userNotifications"] });
    },
  });
}

export function useInviteParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      petitionId,
      email,
      role,
    }: {
      petitionId: string;
      email: string;
      role: string;
    }) => {
      const response = await inviteParticipant(petitionId, email, role);
      return handleActionResponse(response);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["petition", variables.petitionId],
      });
    },
  });
}

export function useMarkNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationIds: string[]) => {
      const response = await markNotificationsAsRead(notificationIds);
      return handleActionResponse(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userNotifications"] });
    },
  });
}
