import { build } from "bun";
import { copyFileSync, mkdirSync } from "fs";

mkdirSync("dist", { recursive: true });

// 1. Copy unminified build to dist/
copyFileSync("src/hx-router.js", "dist/hx-router.js");

// 2. Copy TypeScript declarations to dist/
copyFileSync("src/hx-router.d.ts", "dist/hx-router.d.ts");

// 3. Build ESM bundle
const esmResult = await build({
  entrypoints: ["src/hx-router.js"],
  outdir: "dist",
  naming: "hx-router.esm.js",
  format: "esm",
  target: "browser"
});

if (!esmResult.success) {
  console.error("ESM Build failed:", esmResult.logs);
  process.exit(1);
}

// 4. Build minified bundle with sourcemap
const minResult = await build({
  entrypoints: ["src/hx-router.js"],
  outdir: "dist",
  naming: "hx-router.min.[ext]",
  minify: true,
  sourcemap: "external",
  target: "browser"
});

if (!minResult.success) {
  console.error("Minified build failed:", minResult.logs);
  process.exit(1);
}

console.log("✓ Successfully built dist/hx-router.esm.js, dist/hx-router.js, dist/hx-router.min.js, and declarations.");
