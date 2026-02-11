import { build as viteBuild } from "vite";
import { build as esbuild } from "esbuild";
import { execSync } from "child_process";
import path from "path";

async function buildVercel() {
  console.log("Pushing database schema...");
  try {
    execSync("npx drizzle-kit push --force", { stdio: "inherit" });
    console.log("Database schema pushed!");
  } catch (err) {
    console.error("Warning: Failed to push database schema:", err);
  }

  console.log("Building client for Vercel...");
  await viteBuild();
  console.log("Client build complete!");

  console.log("Bundling API for Vercel...");
  await esbuild({
    entryPoints: [path.resolve("server/vercel-entry.ts")],
    bundle: true,
    platform: "node",
    target: "node20",
    format: "esm",
    outfile: "api/index.mjs",
    external: [
      "pg-native",
      "better-sqlite3",
      "mysql2",
      "tedious",
      "oracledb",
    ],
    tsconfig: "tsconfig.json",
    alias: {
      "@shared": path.resolve("shared"),
    },
    banner: {
      js: `import { createRequire } from 'module'; import { fileURLToPath as __esm_fileURLToPath } from 'url'; import { dirname as __esm_dirname } from 'path'; const require = createRequire(import.meta.url); const __filename = __esm_fileURLToPath(import.meta.url); const __dirname = __esm_dirname(__filename);`,
    },
  });
  console.log("API bundle complete!");
}

buildVercel().catch((err) => {
  console.error(err);
  process.exit(1);
});
