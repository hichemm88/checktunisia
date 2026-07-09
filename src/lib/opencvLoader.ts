/**
 * Lazy loader for OpenCV.js (@techstark/opencv-js).
 *
 * OpenCV's WASM build is ~9 MB, so it must never sit in the main bundle. We
 * `import()` it dynamically — Vite emits a separate chunk that is fetched only
 * the first time the MRZ scanner runs. The module is cached across scans.
 *
 * The @techstark build finishes WASM instantiation asynchronously; `cv.Mat` is
 * undefined until the runtime is ready, so we await `onRuntimeInitialized`.
 */

// The cv object is typed loosely on purpose — OpenCV.js has no first-class TS types.
/* eslint-disable @typescript-eslint/no-explicit-any */
type Cv = any;

let cvPromise: Promise<Cv> | null = null;

export function loadOpenCv(): Promise<Cv> {
  if (cvPromise) return cvPromise;

  cvPromise = (async () => {
    const mod: any = await import('@techstark/opencv-js');
    const cv: Cv = mod.default ?? mod;

    // Some builds resolve the module to a thenable that fulfils with cv.
    const resolved: Cv = typeof cv?.then === 'function' ? await cv : cv;

    if (resolved?.Mat) return resolved;

    await new Promise<void>((res, rej) => {
      const timer = setTimeout(() => rej(new Error('OpenCV runtime init timeout')), 20000);
      resolved.onRuntimeInitialized = () => { clearTimeout(timer); res(); };
    });

    return resolved;
  })();

  // Let a failed load be retried on the next call rather than caching the rejection.
  cvPromise.catch(() => { cvPromise = null; });

  return cvPromise;
}
