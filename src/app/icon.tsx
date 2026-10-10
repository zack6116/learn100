import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: "#187a45",
          borderRadius: 8,
          display: "flex",
          flexWrap: "wrap",
          alignContent: "center",
          justifyContent: "center",
          gap: 3,
          padding: 6,
        }}
      >
        <div style={{ width: 8, height: 8, background: "white", borderRadius: 2 }} />
        <div style={{ width: 8, height: 8, background: "white", borderRadius: 2 }} />
        <div style={{ width: 8, height: 8, background: "white", borderRadius: 2 }} />
        <div style={{ width: 8, height: 8, background: "white", borderRadius: 2 }} />
      </div>
    ),
    { ...size },
  );
}
