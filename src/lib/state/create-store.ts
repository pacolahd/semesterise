// src/lib/state/create-store.ts
import { z } from "zod";
import { StateCreator, create } from "zustand";
import { PersistOptions, createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

// Helper to check if window is available (for SSR)
const isClient = typeof window !== "undefined";

type StoreOptions<T extends object, SchemaType extends object = T> = {
  name?: string;
  storage?: boolean | Storage;
  partialize?: (state: T) => Partial<T>;
  schema?: z.ZodType<SchemaType>;
  onRehydrateStorage?: (
    state: T | undefined
  ) => ((state: T | undefined, error: Error | null) => void) | void;
};

export function createStore<T extends object, SchemaType extends object = T>(
  initializer: StateCreator<T, [["zustand/immer", never]], []>,
  options?: StoreOptions<T, SchemaType>
) {
  type StoreState = T & {
    _validationErrors?: z.ZodIssue[];
  };

  // Base store with Immer and validation
  let store = immer<StoreState>((set, get, api) => ({
    ...initializer(set, get, api),
    _validationErrors: undefined,
  }));

  // Add validation if schema exists
  if (options?.schema) {
    const originalStore = store;
    store = (set, get, api) => {
      return originalStore(
        (fn) => {
          set((draft) => {
            // Apply original update
            const result = typeof fn === "function" ? fn(draft) : fn;
            Object.assign(draft, result);

            // Only validate on client side
            if (isClient) {
              try {
                // Validate without mutating original state
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { _validationErrors, ...toValidate } = draft;
                const validation = options?.schema?.safeParse(toValidate);

                // Update validation errors using Immer draft
                if (validation?.success) {
                  draft._validationErrors = undefined;
                } else {
                  draft._validationErrors = validation?.error?.issues;

                  // Log validation errors in development
                  // eslint-disable-next-line no-process-env
                  if (process.env.NODE_ENV !== "production") {
                    console.warn(
                      "State validation failed:",
                      validation?.error?.issues
                    );
                  }
                }
              } catch (error) {
                // Fallback if validation fails completely
                console.error("State validation error:", error);
              }
            }

            return draft;
          });
        },
        get,
        api
      );
    };
  }

  // Add persistence if enabled
  if (options?.name && options?.storage !== false && isClient) {
    const persistOptions: PersistOptions<StoreState, Partial<StoreState>> = {
      name: options.name,
      // Handle custom storage if provided
      storage:
        typeof options.storage === "object"
          ? createJSONStorage(() => options.storage as Storage)
          : createJSONStorage(() => localStorage),
      partialize: (state) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { _validationErrors, ...rest } = state;

          // Handle non-serializable values safely
          const safeState = JSON.parse(
            JSON.stringify(rest)
          ) as Partial<StoreState>;

          // Use custom partialize if provided
          if (options.partialize) {
            return options.partialize(
              safeState as unknown as T
            ) as unknown as Partial<StoreState>;
          }

          return safeState;
        } catch (error) {
          console.error(`Error partializing state for ${options.name}:`, error);
          return {} as Partial<StoreState>;
        }
      },
      // Add hydration callback
      onRehydrateStorage: (state) => {
        // Log hydration in development
        // eslint-disable-next-line no-process-env
        if (process.env.NODE_ENV !== "production") {
          console.debug(`Rehydrating store: ${options.name}`);
        }

        // Call custom rehydration handler if provided
        if (options.onRehydrateStorage) {
          const handler = options.onRehydrateStorage(state as T | undefined);
          if (handler) {
            // Return a properly typed function that conforms to Zustand's expected signature
            return (state?: StoreState | undefined, error?: unknown) => {
              handler(state as T | undefined, error as Error | null);
            };
          }
          return undefined;
        }

        // Default handler with Zustand's expected signature
        return (state?: StoreState | undefined, error?: unknown) => {
          if (error) {
            console.error(`Error rehydrating ${options.name}:`, error);
            // eslint-disable-next-line no-process-env
          } else if (process.env.NODE_ENV !== "production") {
            console.debug(`${options.name} rehydrated successfully`);
          }
        };
      },
    };

    return create<StoreState>()(persist(store, persistOptions));
  }

  // No persistence
  return create<StoreState>()(store);
}
