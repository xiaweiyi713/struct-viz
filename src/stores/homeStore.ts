import { create } from "zustand";
import { persist } from "zustand/middleware";

const MAX_RECENT = 12;

interface HomeState {
  favoriteIds: string[];
  recentIds: string[];

  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  addRecent: (id: string) => void;
}

export const useHomeStore = create<HomeState>()(
  persist(
    (set, get) => ({
      favoriteIds: [],
      recentIds: [],

      toggleFavorite: (id) =>
        set((s) => ({
          favoriteIds: s.favoriteIds.includes(id)
            ? s.favoriteIds.filter((f) => f !== id)
            : [...s.favoriteIds, id],
        })),

      isFavorite: (id) => get().favoriteIds.includes(id),

      addRecent: (id) =>
        set((s) => {
          const filtered = s.recentIds.filter((r) => r !== id);
          return { recentIds: [id, ...filtered].slice(0, MAX_RECENT) };
        }),
    }),
    { name: "struct-viz-home" },
  ),
);
