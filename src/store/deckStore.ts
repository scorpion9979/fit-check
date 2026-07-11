import { create } from "zustand";
import { persist } from "zustand/middleware";
import { MatchCard } from "@/lib/schema/match";
import { Bid } from "@/lib/schema/bid";

interface DeckState {
  bid: Bid | null;
  cards: MatchCard[];
  currentIndex: number;
  passedIds: string[];
  savedCards: MatchCard[];
  setBid: (bid: Bid) => void;
  setCards: (cards: MatchCard[]) => void;
  passCurrent: () => void;
  saveCurrent: () => void;
  resetDeck: () => void;
  getCurrentCard: () => MatchCard | null;
}

export const useDeckStore = create<DeckState>()(
  persist(
    (set, get) => ({
      bid: null,
      cards: [],
      currentIndex: 0,
      passedIds: [],
      savedCards: [],

      setBid: (bid) => set({ bid }),
      setCards: (cards) => set({ cards, currentIndex: 0, passedIds: [] }),

      passCurrent: () => {
        const { cards, currentIndex, passedIds } = get();
        const current = cards[currentIndex];
        if (!current) return;
        set({
          passedIds: [...passedIds, current.match_id],
          currentIndex: currentIndex + 1,
        });
      },

      saveCurrent: () => {
        const { cards, currentIndex, savedCards } = get();
        const current = cards[currentIndex];
        if (!current) return;
        const alreadySaved = savedCards.some((c) => c.match_id === current.match_id);
        set({
          savedCards: alreadySaved ? savedCards : [...savedCards, current],
          currentIndex: currentIndex + 1,
        });
      },

      resetDeck: () =>
        set({
          bid: null,
          cards: [],
          currentIndex: 0,
          passedIds: [],
          savedCards: [],
        }),

      getCurrentCard: () => {
        const { cards, currentIndex } = get();
        return cards[currentIndex] ?? null;
      },
    }),
    { name: "fleek-deck-store" },
  ),
);
