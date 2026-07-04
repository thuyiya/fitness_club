/**
 * On-device AI coach: manages opting in, downloading the GGUF model in the
 * background (with progress), loading it into llama.rn, and streaming replies.
 *
 * The native llama context and the download handle are NOT serialisable, so
 * they live as module-level singletons; only `optedIn` / `downloaded` persist.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import * as FileSystem from 'expo-file-system';
import { zustandStorage } from './storage';
import { MODEL } from '@/lib/llm/config';
import { LlmMessage } from '@/lib/coach';

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
  status: AiStatus;
  progress: number; // 0..1
  error: string | null;
  /** Engine present in this build (native module linked). */
  available: boolean;
  /** Opt in + download the model if needed, then load it. */
  connect: () => Promise<void>;
  /** Ensure the model is loaded into memory. Returns true when ready. */
  ensureReady: () => Promise<boolean>;
  /** Stream a reply for the given chat messages. */
  generate: (messages: LlmMessage[], onToken: (token: string) => void) => Promise<string>;
  /** Delete the model and reset (frees ~940 MB). */
  removeModel: () => Promise<void>;
}

let llamaCtx: LlamaContext | null = null;
let downloadHandle: FileSystem.DownloadResumable | null = null;

const MODEL_PATH = (FileSystem.documentDirectory ?? '') + MODEL.fileName;

export const useAiCoachStore = create<AiCoachState>()(
  persist(
    (set, get) => ({
      optedIn: false,
      downloaded: false,
      status: 'idle',
      progress: 0,
      error: null,
      available: !!initLlama,

      connect: async () => {
        set({ optedIn: true, error: null });

        const info = await FileSystem.getInfoAsync(MODEL_PATH);
        const haveFile = info.exists && (info.size ?? 0) >= MODEL.minBytes;

        if (!haveFile) {
          // Remove any partial/corrupt file before a fresh download.
          if (info.exists) await FileSystem.deleteAsync(MODEL_PATH, { idempotent: true });
          set({ status: 'downloading', progress: 0 });
          try {
            downloadHandle = FileSystem.createDownloadResumable(
              MODEL.url,
              MODEL_PATH,
              {},
              (p) => {
                const total = p.totalBytesExpectedToWrite > 0
                  ? p.totalBytesExpectedToWrite
                  : MODEL.approxBytes;
                set({ progress: Math.min(1, p.totalBytesWritten / total) });
              },
            );
            const result = await downloadHandle.downloadAsync();
            downloadHandle = null;
            if (!result) {
              // Paused/cancelled — leave optedIn so the card offers "Resume".
              set({ status: 'idle' });
              return;
            }
          } catch (e) {
            downloadHandle = null;
            set({ status: 'error', error: describe(e) });
            return;
          }
        }

        set({ downloaded: true });
        await get().ensureReady();
      },

      ensureReady: async () => {
        if (llamaCtx) {
          set({ status: 'ready', progress: 1 });
          return true;
        }
        if (!initLlama) {
          set({ status: 'error', error: 'The on-device coach is not available in this build.' });
          return false;
        }
        const info = await FileSystem.getInfoAsync(MODEL_PATH);
        if (!info.exists) {
          set({ downloaded: false, status: 'idle' });
          return false;
        }
        set({ status: 'preparing' });
        try {
          llamaCtx = await initLlama({
            model: MODEL_PATH.replace('file://', ''),
            n_ctx: MODEL.contextTokens,
            n_gpu_layers: MODEL.gpuLayers,
          });
          set({ status: 'ready', progress: 1 });
          return true;
        } catch (e) {
          set({ status: 'error', error: describe(e) });
          return false;
        }
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
        try {
          await FileSystem.deleteAsync(MODEL_PATH, { idempotent: true });
        } catch {
          /* ignore */
        }
        set({ optedIn: false, downloaded: false, status: 'idle', progress: 0, error: null });
      },
    }),
    {
      name: 'ai-coach',
      storage: createJSONStorage(() => zustandStorage),
      // Native handles can't be persisted; only remember the user's choice.
      partialize: (s) => ({ optedIn: s.optedIn, downloaded: s.downloaded }),
    },
  ),
);

function describe(e: unknown): string {
  if (e instanceof Error) return e.message;
  return typeof e === 'string' ? e : 'Something went wrong';
}
