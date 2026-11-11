import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { CanvasTexture, SRGBColorSpace } from "three";
import type { LogoComponent } from "@/components/sections/tech/techIcons";

const NS = "http://www.w3.org/2000/svg";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Rasterise a real logo component (react-icons / lucide) to a white-on-transparent texture; tinted later via material.color. */
export async function rasterizeLogo(Icon: LogoComponent, px = 192): Promise<CanvasTexture | null> {
  const host = document.createElement("div");
  const root = createRoot(host);
  try {
    root.render(createElement(Icon, { size: px, color: "#ffffff", xmlns: NS }));
    let svg = "";
    for (let i = 0; i < 20 && !svg; i++) { await wait(10); svg = host.querySelector("svg")?.outerHTML ?? ""; }
    if (!svg) return null;
    const img = new Image();
    img.decoding = "async";
    const loaded = new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error("logo")); });
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await loaded;
    const c = document.createElement("canvas");
    c.width = c.height = px;
    c.getContext("2d")?.drawImage(img, 0, 0, px, px);
    const tex = new CanvasTexture(c);
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  } catch {
    return null; // node falls back to a plain hex plate — never blocks the scene
  } finally {
    root.unmount();
  }
}
