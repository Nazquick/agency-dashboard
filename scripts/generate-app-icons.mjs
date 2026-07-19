// One-off generator for PWA/home-screen app icons — the YOKUME dot + "Y"
// monogram on the brand's dark background. Run with:
//   node scripts/generate-app-icons.mjs
// Not part of the build; outputs are committed as static files.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import React from "react";
import { ImageResponse } from "next/og.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function mark(size) {
  const dot = Math.round(size * 0.09);
  const letter = Math.round(size * 0.52);

  return React.createElement(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: Math.round(size * 0.04),
        background: "#0a0b10",
      },
    },
    React.createElement("div", {
      style: {
        width: dot,
        height: dot,
        borderRadius: dot * 0.15,
        background: "#f5f2ea",
      },
    }),
    React.createElement(
      "div",
      {
        style: {
          fontSize: letter,
          fontWeight: 800,
          fontFamily: "sans-serif",
          color: "#f5f2ea",
          lineHeight: 1,
        },
      },
      "Y"
    )
  );
}

async function render(size, outPath) {
  const response = new ImageResponse(mark(size), { width: size, height: size });
  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(outPath, buffer);
  console.log(`Wrote ${path.relative(root, outPath)} (${size}x${size})`);
}

await render(180, path.join(root, "app", "apple-icon.png"));
await render(192, path.join(root, "public", "icons", "icon-192.png"));
await render(512, path.join(root, "public", "icons", "icon-512.png"));
