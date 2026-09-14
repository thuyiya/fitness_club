/**
 * MMKV-backed persistence adapter for Zustand.
 * Falls back to an in-memory shim when MMKV native module is unavailable
 * (e.g. web / tests), so stores work everywhere.
 */
import { StateStorage } from 'zustand/middleware';

let mmkv: { set: (k: string, v: string) => void; getString: (k: string) => string | undefined; delete: (k: string) => void };

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { MMKV } = require('react-native-mmkv');
  const instance = new MMKV({ id: 'ai-weight-coach' });
  mmkv = {
    set: (k, v) => instance.set(k, v),
    getString: (k) => instance.getString(k),
    delete: (k) => instance.delete(k),
  };
} catch {
  const mem = new Map<string, string>();
  mmkv = {
    set: (k, v) => void mem.set(k, v),
    getString: (k) => mem.get(k),
    delete: (k) => void mem.delete(k),
  };
}

export const zustandStorage: StateStorage = {
  setItem: (name, value) => mmkv.set(name, value),
  getItem: (name) => mmkv.getString(name) ?? null,
  removeItem: (name) => mmkv.delete(name),
};
