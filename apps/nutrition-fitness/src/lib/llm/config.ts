/**
 * On-device LLM model definition.
 *
 * We run Qwen2.5-1.5B-Instruct (Q4_K_M GGUF) locally via llama.rn. The model
 * file is ~940 MB and is downloaded to the app's document directory on first
 * opt-in — it is never bundled in the app binary.
 */
export const MODEL = {
  displayName: 'Qwen2.5 1.5B Instruct',
  fileName: 'qwen2.5-1.5b-instruct-q4_k_m.gguf',
  url: 'https://huggingface.co/bartowski/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/Qwen2.5-1.5B-Instruct-Q4_K_M.gguf',
  /** Approximate download size, used for the progress bar before the server reports Content-Length. */
  approxBytes: 986_048_768,
  /** A finished file smaller than this is treated as incomplete/corrupt and re-downloaded. */
  minBytes: 900_000_000,
  sizeLabel: '~940 MB',
  /** llama.cpp context window (tokens). Keeps memory modest on phones. */
  contextTokens: 2048,
  /** Max tokens to generate per reply. */
  maxReplyTokens: 400,
  /**
   * GPU offload layers. Kept at 0 (CPU) because llama.cpp with Metal HARD-CRASHES
   * on the iOS Simulator — CPU works on both simulator and device. For a
   * physical-device / TestFlight build, set this to 99 for full Metal
   * acceleration (much faster). Do NOT ship 99 while testing on the simulator.
   */
  gpuLayers: 0,
  /** Qwen chat-template stop tokens. */
  stopWords: ['<|im_end|>', '<|endoftext|>'],
} as const;
