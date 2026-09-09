import { build } from "bun";
import { copyFileSync, mkdirSync } from "fs";

mkdirSync("dist", { recursive: true });

// 1. Copy unminified build to dist/
copyFileSync("src/hx-router.js", "dist/hx-router.js");

// 2. Build minified bundle with sourcemap
const result = await build({
  entrypoints: ["src/hx-router.js"],
  outdir: "dist",
  naming: "hx-router.min.[ext]",
  minify: true,
  sourcemap: "external",
  target: "browser"
});

if (!result.success) {
  console.error("Build failed:", result.logs);
  process.exit(1);
}

console.log("✓ Successfully built dist/hx-router.js and dist/hx-router.min.js");
