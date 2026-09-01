import { create } from 'zustand';
import { freshRSA, STEPS } from '../services/rsa';
import type { RSAEntry, Belief } from '../services/rsa';

export type View = 'setup' | 'profile' | 'checkin' | 'landing' | 'crisis' | 'flow' | 'summary' | 'journal' | 'po-dashboard';

interface UserData {
  userId: string;
  recoveryCode: string;
}

interface RSAStore {
  // User data
  currentUser: UserData | null;
  userProfile: Record<string, unknown> | null;

  // Current RSA being worked on
  currentEntry: RSAEntry;

  // UI state
  view: View;
  step: number; // 0-4, index into STEPS
  activeBeliefIdx: number;

  // Belief suggestions (step B)
  beliefSuggestions: string[];
  suggestLoading: boolean;
  suggestError: string;

  // Journal (saved entries)
  entries: RSAEntry[];

  // User actions
  setUser: (userId: string, recoveryCode: string) => void;
  setProfile: (profile: Record<string, unknown>) => void;
  clearUser: () => void;

  // Current RSA actions
  setSituation: (text: string) => void;
  setStepA: (text: string) => void;
  addBelief: (text: string) => void;
  setBelief: (idx: number, updates: Partial<Belief>) => void;
  removeBelief: (idx: number) => void;
  setActiveBeliefIdx: (idx: number) => void;

  setEmotions: (emotions: string[]) => void;
  setBehavior: (text: string) => void;
  setEffect: (text: string) => void;
  setAction: (text: string) => void;

  // Belief suggestions (Step B)
  setBeliefSuggestions: (suggestions: string[], loading?: boolean, error?: string) => void;

  // Navigation
  goToStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  setView: (view: View) => void;

  // Journal
  saveEntry: () => void;
  loadEntries: () => void;
  deleteEntry: (id: string) => void;

  // Reset
  reset: () => void;
  resetEntry: () => void;
}

const initialState = {
  currentUser: null,
  userProfile: null,
  currentEntry: freshRSA(),
  view: 'setup' as View,
  step: 0,
  activeBeliefIdx: -1,
  beliefSuggestions: [],
  suggestLoading: false,
  suggestError: '',
  entries: [],
};

export const useRSAStore = create<RSAStore>((set) => ({
        ...initialState,

        setUser: (userId, recoveryCode) =>
          set({ currentUser: { userId, recoveryCode }, view: 'profile' }),

        setProfile: (profile) =>
          set({ userProfile: profile, view: 'checkin' }),

        clearUser: () =>
          set({ currentUser: null, userProfile: null, view: 'setup' }),

        setSituation: (text) =>
          set((state) => ({
            currentEntry: { ...state.currentEntry, situation: text },
          })),

        setStepA: (text) =>
          set((state) => ({
            currentEntry: { ...state.currentEntry, a: text },
          })),

        addBelief: (text) =>
          set((state) => {
            const newBelief: Belief = {
              id: `belief-${Date.now()}`,
              text,
              ruleAnswers: { reality: true, health: true, goals: true, conflict: true, emotion: true },
              rewrite: '',
              aiFeedback: '',
              aiFeedbackLoading: false,
              aiFeedbackError: '',
            };
            return {
              currentEntry: {
                ...state.currentEntry,
                beliefs: [...state.currentEntry.beliefs, newBelief],
              },
            };
          }),

        setBelief: (idx, updates) =>
          set((state) => {
            const beliefs = [...state.currentEntry.beliefs];
            beliefs[idx] = { ...beliefs[idx], ...updates };
            return {
              currentEntry: {
                ...state.currentEntry,
                beliefs,
              },
            };
          }),

        removeBelief: (idx) =>
          set((state) => ({
            currentEntry: {
              ...state.currentEntry,
              beliefs: state.currentEntry.beliefs.filter((_, i) => i !== idx),
            },
          })),

        setActiveBeliefIdx: (idx) =>
          set({ activeBeliefIdx: idx }),

        setEmotions: (emotions) =>
          set((state) => ({
            currentEntry: { ...state.currentEntry, emotions },
          })),

        setBehavior: (text) =>
          set((state) => ({
            currentEntry: { ...state.currentEntry, behavior: text },
          })),

        setEffect: (text) =>
          set((state) => ({
            currentEntry: { ...state.currentEntry, effect: text },
          })),

        setAction: (text) =>
          set((state) => ({
            currentEntry: { ...state.currentEntry, action: text },
          })),

        setBeliefSuggestions: (suggestions, loading = false, error = '') =>
          set({
            beliefSuggestions: suggestions,
            suggestLoading: loading,
            suggestError: error,
          }),

        goToStep: (step) =>
          set({ step: Math.max(0, Math.min(step, STEPS.length - 1)) }),

        nextStep: () =>
          set((state) => ({
            step: Math.min(state.step + 1, STEPS.length - 1),
          })),

        previousStep: () =>
          set((state) => ({
            step: Math.max(state.step - 1, 0),
          })),

        setView: (view) => set({ view }),

        saveEntry: () =>
          set((state) => ({
            entries: [...state.entries, state.currentEntry],
            currentEntry: freshRSA(),
            step: 0,
            view: 'checkin',
          })),

        loadEntries: () => {
          // Entries are already loaded from localStorage via persist middleware
        },

        deleteEntry: (id) =>
          set((state) => ({
            entries: state.entries.filter((e) => e.id !== id),
          })),

        reset: () =>
          set({
            ...initialState,
          }),

        resetEntry: () =>
          set({
            currentEntry: freshRSA(),
            step: 0,
            activeBeliefIdx: -1,
            beliefSuggestions: [],
            suggestLoading: false,
            suggestError: '',
          }),
      }));
