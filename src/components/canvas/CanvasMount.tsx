"use client";
import dynamic from "next/dynamic";
import { Component, useEffect, type ReactNode } from "react";
import { markWebglFailed, useDeviceProfile } from "@/lib/deviceProfile";

/** WebGL is client-only and lazy-loaded (three/R3F never ship in the initial bundle — and not at all when the device gets the static tier). */
const PersistentCanvas = dynamic(() => import("./PersistentCanvas"), { ssr: false });

/** If WebGL is unavailable or crashes, the HTML experience keeps working on the dark background. */
class CanvasBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    markWebglFailed(); // every scene swaps to its semantic DOM layout; the hero shows its static portrait
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function CanvasMount() {
  const profile = useDeviceProfile();

  // CSS hook for the static tier (`html[data-canvas="none"]` paints CSS-only atmosphere where the 3D would be).
  useEffect(() => {
    if (profile.reason === "server") return;
    document.documentElement.dataset.canvas = profile.canvas;
    if (new URLSearchParams(window.location.search).has("quality-debug")) console.info("[device]", profile);
  }, [profile]);

  if (profile.canvas === "none") return null;
  return (
    <CanvasBoundary>
      <PersistentCanvas />
    </CanvasBoundary>
  );
}
