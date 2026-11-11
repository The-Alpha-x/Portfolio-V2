import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const alt = "HUMAN × MACHINE — Nirmal Amanda, Full Stack Developer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Generated at build time: same CRIMSON PROTOCOL palette, no external assets or fonts to fetch. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 72, background: "radial-gradient(60% 70% at 85% 10%, #3a0a12, #080809 70%)", color: "#f2eeee" }}>
        <div style={{ fontSize: 22, letterSpacing: 8, color: "#969092" }}>HUMAN × MACHINE</div>
        <div style={{ fontSize: 112, fontWeight: 700, letterSpacing: -3, lineHeight: 1, marginTop: 16 }}>NIRMAL AMANDA</div>
        <div style={{ display: "flex", alignItems: "center", marginTop: 24, fontSize: 28, letterSpacing: 10, color: "#c1b9b8" }}>
          <div style={{ width: 56, height: 2, background: "#ff2638", marginRight: 20 }} />FULL STACK DEVELOPER
        </div>
      </div>
    ),
    size
  );
}
