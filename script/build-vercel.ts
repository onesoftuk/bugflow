import { build as viteBuild } from "vite";

async function buildVercel() {
  console.log("building client for Vercel...");
  await viteBuild();
  console.log("client build complete!");
}

buildVercel().catch((err) => {
  console.error(err);
  process.exit(1);
});
