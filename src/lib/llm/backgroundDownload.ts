/**
 * True OS-level background download for the GGUF model.
 *
 * `expo-file-system`'s `createDownloadResumable` only runs while the JS runtime
 * is alive — the moment the app is killed the download dies. To keep a ~940 MB
 * download going while the app is backgrounded or closed we use a native
 * downloader:
 *   • iOS    → an `NSURLSession` background session (the OS keeps downloading
 *              after the app is suspended/terminated and relaunches it to finish;
 *              a user *force-quit* from the app switcher does cancel it — Apple
 *              limitation, unavoidable).
 *   • Android → a foreground service / DownloadManager (survives backgrounding
 *              and being swiped away, subject to OS battery limits).
 *
 * The native module is absent on web/tests and before the app is rebuilt with
 * the new dependency, so we load it lazily and expose `backgroundDownloadAvailable`.
 */
import { MODEL } from './config';

/** Stable id so we can reattach to the same download across app launches. */
const TASK_ID = 'ai-coach-model';

export interface DownloadEvents {
  onBegin?: (totalBytes: number) => void;
  onProgress: (bytesDownloaded: number, bytesTotal: number) => void;
  onDone: () => void;
  onError: (message: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let RNBD: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  RNBD = require('@kesha-antonov/react-native-background-downloader');
} catch {
  RNBD = null;
}

export const backgroundDownloadAvailable = !!RNBD;

/**
 * Plain filesystem path (no `file://`) where the model is downloaded. The
 * downloader's documents dir maps to the same location as
 * `expo-file-system`'s `documentDirectory` on both platforms, so llama.rn can
 * load straight from it.
 */
export function modelDestination(): string | null {
  if (!RNBD) return null;
  return `${RNBD.directories.documents}/${MODEL.fileName}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wire(task: any, events: DownloadEvents) {
  task
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .begin(({ expectedBytes }: any) => events.onBegin?.(expectedBytes ?? MODEL.approxBytes))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .progress(({ bytesDownloaded, bytesTotal }: any) =>
      events.onProgress(bytesDownloaded ?? 0, bytesTotal ?? MODEL.approxBytes),
    )
    .done(() => {
      // Let iOS know we're done so it can release the background session.
      try {
        RNBD.completeHandler(task.id);
      } catch {
        /* ignore */
      }
      events.onDone();
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .error(({ error }: any) =>
      events.onError(typeof error === 'string' ? error : 'Download failed'),
    );
  return task;
}

/**
 * Start (or restart) the background model download. Returns false when no native
 * downloader is present in this build.
 */
export function startModelDownload(events: DownloadEvents, wifiOnly = true): boolean {
  if (!RNBD) {
    events.onError('The on-device coach downloader is not available in this build.');
    return false;
  }
  const destination = modelDestination();
  if (!destination) return false;
  const task = RNBD.download({
    id: TASK_ID,
    url: MODEL.url,
    destination,
    // Wi-Fi only: refuse metered/roaming networks. The OS resumes when Wi-Fi returns.
    isAllowedOverMetered: !wifiOnly,
    isAllowedOverRoaming: !wifiOnly,
    // Android foreground-service notification copy.
    notificationTitle: 'Preparing your coach',
    notificationBody: `Downloading ${MODEL.sizeLabel} · one time`,
  });
  wire(task, events);
  return true;
}

/**
 * Reattach to a download that's still running from a previous app session.
 * Call once on app start. Returns true when an in-flight task was found.
 */
export async function reattachModelDownload(events: DownloadEvents): Promise<boolean> {
  if (!RNBD) return false;
  try {
    const tasks = await RNBD.checkForExistingDownloads();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const task = tasks.find((t: any) => t.id === TASK_ID);
    if (!task) return false;
    wire(task, events);
    // Some platforms need a nudge to resume after relaunch.
    try {
      RNBD.ensureDownloadsAreRunning?.();
    } catch {
      /* ignore */
    }
    return true;
  } catch {
    return false;
  }
}

/** Cancel and clean up the background download (used when the user removes the model). */
export async function stopModelDownload(): Promise<void> {
  if (!RNBD) return;
  try {
    const tasks = await RNBD.checkForExistingDownloads();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tasks.forEach((t: any) => {
      if (t.id === TASK_ID) t.stop?.();
    });
  } catch {
    /* ignore */
  }
}
