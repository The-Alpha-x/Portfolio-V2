/**
 * Pre-loader ↔ site bridge. Plain mutable module (same pattern as heroState): never put these in React state.
 *
 *   idle      no <Preloader/> has claimed the page → everything behaves exactly as before the pre-loader existed
 *   active    boot sequence is playing; the hero opening sequence must wait
 *   released  the hero may start (fired as the shutters begin to open, not when they finish)
 */
export type PreloaderStatus = "idle" | "active" | "released";

export const preloaderState = { status: "idle" as PreloaderStatus };

const listeners = new Set<() => void>();

export const isPreloaderActive = () => preloaderState.status === "active";

export function claimPreloader() {
  preloaderState.status = "active";
}

/** Idempotent. Runs every waiting listener once. */
export function releasePreloader() {
  if (preloaderState.status === "released") return;
  preloaderState.status = "released";
  listeners.forEach((l) => l());
  listeners.clear();
}

/** React StrictMode / HMR: an unmounted-before-release pre-loader must not leave the page claimed. */
export function unclaimPreloader() {
  if (preloaderState.status === "active") preloaderState.status = "idle";
}

/** Calls `cb` once the pre-loader releases the page (immediately if it is not active). Returns an unsubscribe. */
export function onPreloaderRelease(cb: () => void) {
  if (preloaderState.status !== "active") {
    cb();
    return () => {};
  }
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
