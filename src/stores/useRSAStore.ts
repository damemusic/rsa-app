import { create } from 'zustand';
import { freshRSA, STEPS } from '../services/rsa';
import type { RSAEntry, Belief } from '../services/rsa';

export type View = 'auth' | 'reset-password' | 'setup' | 'profile' | 'checkin' | 'landing' | 'crisis' | 'flow' | 'summary' | 'journal' | 'po-dashboard' | 'family' | 'ai-chat' | 'ai-rsa';

interface UserData {
  userId: string;
  recoveryCode: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  role: 'parent' | 'sibling' | 'partner' | 'friend' | 'child' | 'other';
  relationshipQuality: 'supportive' | 'neutral' | 'strained';
  interactionFrequency: 'daily' | 'weekly' | 'monthly' | 'rarely';
  anxietyTriggers: string;
}

export interface ScenarioResponse {
  id: string;
  scenario: string;
  userResponse: string;
  timestamp: number;
}

export interface AIProfile {
  familyMembers: FamilyMember[];
  scenarioResponses: ScenarioResponse[];
  reactionPatterns: string[];
  lastUpdated: number;
}

interface RSAStore {
  // User data
  currentUser: UserData | null;
  userProfile: Record<string, unknown> | null;

  // AI Profile (family & scenarios)
  aiProfile: AIProfile;
  // True once the AI profile has been hydrated from (or confirmed absent on) the backend.
  // Nothing may save the AI profile before this flips, or an empty local profile
  // overwrites the stored one.
  aiProfileLoaded: boolean;

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
  setCurrentEntry: (entry: RSAEntry) => void;
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

  // Family & AI Profile actions
  setAIProfile: (profile: Partial<AIProfile> | null) => void;
  addFamilyMember: (member: Omit<FamilyMember, 'id'>) => void;
  updateFamilyMember: (id: string, updates: Partial<FamilyMember>) => void;
  deleteFamilyMember: (id: string) => void;
  addScenarioResponse: (scenario: string, response: string) => void;
  clearScenarioResponses: () => void;
  updateReactionPatterns: (patterns: string[]) => void;

  // Navigation
  goToStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  setView: (view: View) => void;

  // Journal
  saveEntry: (userId: string, recoveryCode: string) => Promise<void>;
  setSavedEntry: () => void;
  loadEntries: () => void;
  setEntries: (entries: RSAEntry[]) => void;
  deleteEntry: (id: string) => void;

  // Reset
  reset: () => void;
  resetEntry: () => void;
}

// Ids must be unique even when several records are created inside the same
// millisecond, which Date.now() alone cannot guarantee.
let idCounter = 0;
const makeId = (prefix: string) => `${prefix}-${Date.now()}-${(idCounter += 1)}`;

const emptyAIProfile = (): AIProfile => ({
  familyMembers: [],
  scenarioResponses: [],
  reactionPatterns: [],
  lastUpdated: 0,
});

const initialState = {
  currentUser: null,
  userProfile: null,
  aiProfile: emptyAIProfile(),
  aiProfileLoaded: false,
  currentEntry: freshRSA(),
  view: 'auth' as View,
  step: 0,
  activeBeliefIdx: -1,
  beliefSuggestions: [],
  suggestLoading: false,
  suggestError: '',
  entries: [],
};

export const useRSAStore = create<RSAStore>((set) => ({
        ...initialState,

        setUser: (userId, recoveryCode) => {
          console.log('[Store] setUser called:', userId);
          set({ currentUser: { userId, recoveryCode } });
        },

        setProfile: (profile) =>
          set({ userProfile: profile, view: 'checkin' }),

        clearUser: () =>
          set({
            currentUser: null,
            userProfile: null,
            view: 'auth',
            // The AI profile belongs to the signed-out user; leaving it in place
            // would leak it into the next session and get saved under their id.
            aiProfile: emptyAIProfile(),
            aiProfileLoaded: false,
            // Same reasoning for the journal: entries feed the AI context and
            // the Decision Log, so they must not survive into the next session.
            entries: [],
            currentEntry: freshRSA(),
            step: 0,
            activeBeliefIdx: -1,
            beliefSuggestions: [],
            suggestLoading: false,
            suggestError: '',
          }),

        setCurrentEntry: (entry) =>
          set({ currentEntry: entry }),

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

        saveEntry: (_userId: string, _recoveryCode: string) => {
          // This will be called from Summary.tsx which handles async
          // For now, just return a resolved promise
          return Promise.resolve();
        },

        setSavedEntry: () =>
          set((state) => ({
            entries: [...state.entries, state.currentEntry],
            currentEntry: freshRSA(),
            step: 0,
            view: 'journal',
          })),

        loadEntries: () => {
          // Entries are already loaded from localStorage via persist middleware
        },

        setEntries: (entries) =>
          set({ entries }),

        deleteEntry: (id) =>
          set((state) => ({
            entries: state.entries.filter((e) => e.id !== id),
          })),

        reset: () =>
          set({
            ...initialState,
            aiProfile: emptyAIProfile(),
            aiProfileLoaded: false,
            currentEntry: freshRSA(),
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

        // Replaces the AI profile wholesale. This is the only correct way to
        // hydrate from the backend — replaying addFamilyMember/addScenarioResponse
        // appends, so every reload used to duplicate the stored data.
        setAIProfile: (profile) =>
          set(() => {
            if (!profile) {
              return { aiProfile: emptyAIProfile(), aiProfileLoaded: true };
            }

            const familyMembers: FamilyMember[] = Array.isArray(profile.familyMembers)
              ? profile.familyMembers
                  .filter((m): m is FamilyMember => !!m && typeof m === 'object')
                  .map((m) => ({
                    id: m.id || makeId('member'),
                    name: m.name || '',
                    role: m.role || 'other',
                    relationshipQuality: m.relationshipQuality || 'neutral',
                    interactionFrequency: m.interactionFrequency || 'weekly',
                    anxietyTriggers: m.anxietyTriggers || '',
                  }))
              : [];

            // Collapse any duplicates left behind by the old append-on-load bug:
            // one response per scenario, most recent wins.
            const byScenario = new Map<string, ScenarioResponse>();
            if (Array.isArray(profile.scenarioResponses)) {
              for (const r of profile.scenarioResponses) {
                if (!r || typeof r !== 'object' || !r.scenario) continue;
                const existing = byScenario.get(r.scenario);
                const timestamp = typeof r.timestamp === 'number' ? r.timestamp : 0;
                if (existing && existing.timestamp >= timestamp) continue;
                byScenario.set(r.scenario, {
                  id: r.id || makeId('scenario'),
                  scenario: r.scenario,
                  userResponse: r.userResponse || '',
                  timestamp,
                });
              }
            }

            return {
              aiProfile: {
                familyMembers,
                scenarioResponses: Array.from(byScenario.values()),
                reactionPatterns: Array.isArray(profile.reactionPatterns)
                  ? profile.reactionPatterns.filter((p): p is string => typeof p === 'string')
                  : [],
                lastUpdated:
                  typeof profile.lastUpdated === 'number' ? profile.lastUpdated : Date.now(),
              },
              aiProfileLoaded: true,
            };
          }),

        addFamilyMember: (member) =>
          set((state) => ({
            aiProfile: {
              ...state.aiProfile,
              familyMembers: [
                ...state.aiProfile.familyMembers,
                { ...member, id: makeId('member') },
              ],
              lastUpdated: Date.now(),
            },
          })),

        updateFamilyMember: (id, updates) =>
          set((state) => ({
            aiProfile: {
              ...state.aiProfile,
              familyMembers: state.aiProfile.familyMembers.map((m) =>
                m.id === id ? { ...m, ...updates } : m
              ),
              lastUpdated: Date.now(),
            },
          })),

        deleteFamilyMember: (id) =>
          set((state) => ({
            aiProfile: {
              ...state.aiProfile,
              familyMembers: state.aiProfile.familyMembers.filter((m) => m.id !== id),
              lastUpdated: Date.now(),
            },
          })),

        // Upsert by scenario: re-answering a question replaces the previous
        // answer instead of stacking a second copy of the same question.
        addScenarioResponse: (scenario, response) =>
          set((state) => {
            const existingIdx = state.aiProfile.scenarioResponses.findIndex(
              (r) => r.scenario === scenario
            );
            const scenarioResponses = [...state.aiProfile.scenarioResponses];
            if (existingIdx >= 0) {
              scenarioResponses[existingIdx] = {
                ...scenarioResponses[existingIdx],
                userResponse: response,
                timestamp: Date.now(),
              };
            } else {
              scenarioResponses.push({
                id: makeId('scenario'),
                scenario,
                userResponse: response,
                timestamp: Date.now(),
              });
            }
            return {
              aiProfile: {
                ...state.aiProfile,
                scenarioResponses,
                lastUpdated: Date.now(),
              },
            };
          }),

        clearScenarioResponses: () =>
          set((state) => ({
            aiProfile: {
              ...state.aiProfile,
              scenarioResponses: [],
              lastUpdated: Date.now(),
            },
          })),

        updateReactionPatterns: (patterns) =>
          set((state) => ({
            aiProfile: {
              ...state.aiProfile,
              reactionPatterns: patterns,
              lastUpdated: Date.now(),
            },
          })),
      }));
