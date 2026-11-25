"use client";

import { create } from "zustand";

export interface CartItem {
  productId: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  licenseType: "lease" | "exclusive";
  priceCents: number;
}

interface CartState {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (productId: string, licenseType: string) => void;
  clear: () => void;
}

export const useCart = create<CartState>((set) => ({
  items: [],
  add: (item) =>
    set((state) => {
      const exists = state.items.some(
        (i) => i.productId === item.productId && i.licenseType === item.licenseType
      );
      if (exists) return state;
      return { items: [...state.items, item] };
    }),
  remove: (productId, licenseType) =>
    set((state) => ({
      items: state.items.filter(
        (i) => !(i.productId === productId && i.licenseType === licenseType)
      ),
    })),
  clear: () => set({ items: [] }),
}));

export interface PlayerTrack {
  trackId: string;
  title: string;
  coverUrl: string | null;
  audioUrl: string | null;
}

interface PlayerState {
  track: PlayerTrack | null;
  playing: boolean;
  play: (track: PlayerTrack) => void;
  toggle: () => void;
  pause: () => void;
  stop: () => void;
  setPlaying: (v: boolean) => void;
}

export const usePlayer = create<PlayerState>((set, get) => ({
  track: null,
  playing: false,
  play: (track) => {
    const current = get().track;
    if (current && current.trackId === track.trackId) {
      set({ playing: !get().playing });
    } else {
      set({ track, playing: true });
    }
  },
  toggle: () => set((s) => ({ playing: !s.playing })),
  pause: () => set({ playing: false }),
  stop: () => set({ track: null, playing: false }),
  setPlaying: (v) => set({ playing: v }),
}));
