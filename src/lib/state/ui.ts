// src/lib/state/ui.ts
import { z } from "zod";

import { createStore } from "./create-store";

// Define just the data part of the state
interface UIStateData {
  sidebarOpen: boolean;
  activeModal: string | null;
}

// Define schema for data only
const uiStateSchema = z.object({
  sidebarOpen: z.boolean(),
  activeModal: z.string().nullable(),
});

// Full state type includes data and actions
interface UIState extends UIStateData {
  setSidebarOpen: (open: boolean) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
}

export const useUIStore = createStore<UIState, UIStateData>(
  (set) => ({
    // Initial state
    sidebarOpen: false,
    activeModal: null,

    // Actions
    setSidebarOpen: (open) =>
      set((state) => {
        state.sidebarOpen = open;
        return state;
      }),

    openModal: (modalId) =>
      set((state) => {
        state.activeModal = modalId;
        return state;
      }),

    closeModal: () =>
      set((state) => {
        state.activeModal = null;
        return state;
      }),
  }),
  {
    name: "semesterise-ui",
    partialize: (state) => ({
      sidebarOpen: state.sidebarOpen,
    }),
    schema: uiStateSchema,
  }
);
