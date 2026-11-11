import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (<div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#080809", border: "3px solid #ff2638", color: "#f2eeee", fontSize: 26, fontWeight: 700 }}>N/A</div>),
    size
  );
}
