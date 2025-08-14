import { create } from "zustand";

type Filters = {
  sport?: string;
  league?: string;
  date?: string;
  market?: string;
  set: (patch: Partial<Filters>) => void;
};

export const useFilters = create<Filters>((set) => ({
  sport: undefined,
  league: undefined,
  date: "today",
  market: "ML",
  set: (patch) => set(patch),
}));
