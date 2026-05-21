import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface GuestRepo {
  repoSlug: string;
  repoName: string;
  repoUrl: string;
  fileCount: number;
  addedAt: number;
  messageCount: number; // messages used in this repo (max 5)
}

interface GuestState {
  repos: GuestRepo[];          // max 2
  addRepo: (repo: Omit<GuestRepo, 'messageCount' | 'addedAt'>) => void;
  incrementMessages: (repoSlug: string) => void;
  canAddRepo: () => boolean;
  canSendMessage: (repoSlug: string) => boolean;
  getRemainingMessages: (repoSlug: string) => number;
  clearAll: () => void;
}

const MAX_REPOS = 2;
const MAX_MESSAGES = 5;

export const useGuestStore = create<GuestState>()(
  persist(
    (set, get) => ({
      repos: [],

      addRepo: (repo) => set(state => ({
        repos: [...state.repos, { ...repo, messageCount: 0, addedAt: Date.now() }],
      })),

      incrementMessages: (repoSlug) => set(state => ({
        repos: state.repos.map(r =>
          r.repoSlug === repoSlug
            ? { ...r, messageCount: r.messageCount + 1 }
            : r
        ),
      })),

      canAddRepo: () => get().repos.length < MAX_REPOS,

      canSendMessage: (repoSlug) => {
        const repo = get().repos.find(r => r.repoSlug === repoSlug);
        return repo ? repo.messageCount < MAX_MESSAGES : false;
      },

      getRemainingMessages: (repoSlug) => {
        const repo = get().repos.find(r => r.repoSlug === repoSlug);
        return repo ? Math.max(0, MAX_MESSAGES - repo.messageCount) : MAX_MESSAGES;
      },

      clearAll: () => set({ repos: [] }),
    }),
    { name: 'codexai-guest' }
  )
);
