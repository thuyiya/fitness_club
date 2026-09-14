/**
 * On-device AI coach: manages opting in, downloading the GGUF model in the
 * background (with progress), loading it into llama.rn, and streaming replies.
 *
 * The download now runs on a native background engine (see
 * `@/lib/llm/backgroundDownload`) so it keeps going while the app is
 * backgrounded or closed, and can be reattached after a relaunch. The native
 * llama context is not serialisable, so it lives as a module-level singleton;
 * only the user's choices persist.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import * as FileSystem from 'expo-file-system';
import { zustandStorage } from './storage';
import { MODEL } from '@/lib/llm/config';
import { LlmMessage } from '@/lib/coach';
import {
  backgroundDownloadAvailable,
  modelDestination,
  reattachModelDownload,
  startModelDownload,
  stopModelDownload,
} from '@/lib/llm/backgroundDownload';
import { ensureNotifyPermission, notifyCoachReady } from '@/lib/notify';

// llama.rn is a native module — absent on web/tests. Load lazily so those
// environments still boot (the store simply reports the engine as unavailable).
let initLlama: ((opts: Record<string, unknown>) => Promise<LlamaContext>) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  initLlama = require('llama.rn').initLlama;
} catch {
  initLlama = null;
}

interface LlamaContext {
  completion: (
    params: Record<string, unknown>,
    onToken?: (data: { token: string }) => void,
  ) => Promise<{ text: string }>;
  release?: () => Promise<void>;
}

export type AiStatus =
  | 'idle' // not opted in, or no model yet
  | 'downloading'
  | 'preparing' // model file present, loading into memory
  | 'ready'
  | 'error';

interface AiCoachState {
  optedIn: boolean;
  downloaded: boolean;
  /** User explicitly removed the model — don't auto-download again. */
  optedOut: boolean;
  status: AiStatus;
  progress: number; // 0..1
  error: string | null;
  /** Engine present in this build (native module linked). */
  available: boolean;
  /** User-initiated: opt in + start the background download, then load. */
  connect: () => void;
  /** Auto-start the background download on app open (Wi-Fi only, once). */
  startAutoDownload: () => void;
  /** Reattach to an in-flight background download after a relaunch. */
  reattach: () => Promise<void>;
  /** Ensure the model is loaded into memory. Returns true when ready. */
  ensureReady: () => Promise<boolean>;
  /** Delete the model file and download it fresh (recovery from a bad file). */
  redownload: () => Promise<void>;
  /** Stream a reply for the given chat messages. */
  generate: (messages: LlmMessage[], onToken: (token: string) => void) => Promise<string>;
  /** Delete the model and reset (frees ~940 MB). */
  removeModel: () => Promise<void>;
}

let llamaCtx: LlamaContext | null = null;
// In-flight model load. llama.rn allows only ONE context, so overlapping
// ensureReady() calls (download-done + screen effect + reattach) must share a
// single init — otherwise the second initLlama throws "Context limit reached"
// and clobbers the successful ready state.
let initPromise: Promise<boolean> | null = null;

// Plain path for llama.rn; file:// URI for expo-file-system checks. When the
// native downloader is present both point at its documents dir; otherwise we
// fall back to expo-file-system's document directory.
const MODEL_PLAIN =
  modelDestination() ??
  (FileSystem.documentDirectory ?? '').replace(/^file:\/\//, '') + MODEL.fileName;
const MODEL_URI = 'file://' + MODEL_PLAIN.replace(/^file:\/\//, '');

export const useAiCoachStore = create<AiCoachState>()(
  persist(
    (set, get) => {
      /** Wire the background download's callbacks into store state. */
      const downloadEvents = {
        onBegin: () => set({ status: 'downloading' }),
        onProgress: (bytesDownloaded: number, bytesTotal: number) => {
          const total = bytesTotal > 0 ? bytesTotal : MODEL.approxBytes;
          set({ status: 'downloading', progress: Math.min(1, bytesDownloaded / total) });
        },
        onDone: async () => {
          set({ downloaded: true, progress: 1 });
          await notifyCoachReady();
          await get().ensureReady();
        },
        onError: (message: string) => set({ status: 'error', error: message }),
      };

      /** Begin (or resume) the background download if the file isn't already present. */
      const beginDownload = async () => {
        const info = await FileSystem.getInfoAsync(MODEL_URI);
        const haveFile = info.exists && (info.size ?? 0) >= MODEL.minBytes;
        if (haveFile) {
          set({ downloaded: true });
          await get().ensureReady();
          return;
        }
        // Remove any partial/corrupt file before a fresh download.
        if (info.exists) await FileSystem.deleteAsync(MODEL_URI, { idempotent: true });

        set({ status: 'downloading', progress: 0, error: null });
        // Ask for notification permission up front so we can post on completion.
        ensureNotifyPermission();
        const started = startModelDownload(downloadEvents, true /* wifiOnly */);
        if (!started) set({ status: 'error', error: 'The on-device coach is not available in this build.' });
      };

      return {
        optedIn: false,
        downloaded: false,
        optedOut: false,
        status: 'idle',
        progress: 0,
        error: null,
        available: !!initLlama && backgroundDownloadAvailable,

        connect: () => {
          set({ optedIn: true, optedOut: false, error: null });
          void beginDownload();
        },

        startAutoDownload: () => {
          const s = get();
          // Skip if unavailable, already handled, user opted out, or in flight.
          if (!s.available) return;
          if (s.optedOut) return;
          if (s.downloaded || s.status === 'ready') return;
          if (s.status === 'downloading' || s.status === 'preparing') return;
          set({ optedIn: true });
          void beginDownload();
        },

        reattach: async () => {
          if (!get().available) return;
          const reattached = await reattachModelDownload(downloadEvents);
          if (reattached) {
            set({ status: 'downloading' });
            return;
          }
          // No live download — if the file finished while we were away, load it.
          const info = await FileSystem.getInfoAsync(MODEL_URI);
          if (info.exists && (info.size ?? 0) >= MODEL.minBytes) {
            set({ downloaded: true });
            await get().ensureReady();
          }
        },

        ensureReady: async () => {
          if (llamaCtx) {
            set({ status: 'ready', progress: 1 });
            return true;
          }
          // Coalesce concurrent callers onto one native init.
          if (initPromise) return initPromise;
          if (!initLlama) {
            set({ status: 'error', error: 'The on-device coach is not available in this build.' });
            return false;
          }
          initPromise = (async () => {
            const info = await FileSystem.getInfoAsync(MODEL_URI);
            if (!info.exists) {
              set({ downloaded: false, status: 'idle' });
              return false;
            }
            set({ status: 'preparing', error: null });
            try {
              llamaCtx = await initLlama({
                model: MODEL_PLAIN,
                n_ctx: MODEL.contextTokens,
                n_gpu_layers: MODEL.gpuLayers,
              });
              set({ status: 'ready', progress: 1 });
              return true;
            } catch (e) {
              set({ status: 'error', error: describe(e) });
              return false;
            }
          })();
          try {
            return await initPromise;
          } finally {
            initPromise = null;
          }
        },

        redownload: async () => {
          try {
            if (llamaCtx?.release) await llamaCtx.release();
          } catch {
            /* ignore */
          }
          llamaCtx = null;
          initPromise = null;
          await stopModelDownload();
          try {
            await FileSystem.deleteAsync(MODEL_URI, { idempotent: true });
          } catch {
            /* ignore */
          }
          set({ downloaded: false, optedOut: false, status: 'idle', progress: 0, error: null });
          await beginDownload();
        },

        generate: async (messages, onToken) => {
          if (!llamaCtx) {
            const ok = await get().ensureReady();
            if (!ok || !llamaCtx) throw new Error('Coach model is not ready');
          }
          let full = '';
          const res = await llamaCtx.completion(
            {
              messages,
              n_predict: MODEL.maxReplyTokens,
              temperature: 0.7,
              top_p: 0.9,
              stop: MODEL.stopWords,
            },
            (data) => {
              if (data?.token) {
                full += data.token;
                onToken(data.token);
              }
            },
          );
          return (full || res?.text || '').trim();
        },

        removeModel: async () => {
          try {
            if (llamaCtx?.release) await llamaCtx.release();
          } catch {
            /* ignore */
          }
          llamaCtx = null;
          await stopModelDownload();
          try {
            await FileSystem.deleteAsync(MODEL_URI, { idempotent: true });
          } catch {
            /* ignore */
          }
          // optedOut stops the auto-downloader from immediately fetching it again.
          set({ optedIn: false, downloaded: false, optedOut: true, status: 'idle', progress: 0, error: null });
        },
      };
    },
    {
      name: 'ai-coach',
      storage: createJSONStorage(() => zustandStorage),
      // Native handles can't be persisted; only remember the user's choices.
      partialize: (s) => ({ optedIn: s.optedIn, downloaded: s.downloaded, optedOut: s.optedOut }),
    },
  ),
);

function describe(e: unknown): string {
  if (e instanceof Error) return e.message;
  return typeof e === 'string' ? e : 'Something went wrong';
}
