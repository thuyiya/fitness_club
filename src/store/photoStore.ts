import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { zustandStorage } from './storage';
export interface PhotoEntry { id: string; uri: string; kind: 'meal' | 'progress'; note: string; createdAt: number; }
export const usePhotoStore = create<{ entries: PhotoEntry[]; add: (entry: PhotoEntry) => void; remove: (id: string) => void }>()(persist((set) => ({
  entries: [],
  add: entry => set(s => ({ entries: [entry, ...s.entries] })),
  remove: id => set(s => ({ entries: s.entries.filter(e => e.id !== id) })),
}), { name: 'photo-journal', storage: createJSONStorage(() => zustandStorage) }));
