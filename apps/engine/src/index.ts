import { loadConfig } from "./config.js";
import { buildPairingLink } from "./auth.js";
import { createServer } from "./server.js";

async function main() {
  const config = loadConfig();
  const server = await createServer({ config, startJobRunner: true });

  await server.app.listen({ host: config.host, port: config.port });

  const link = buildPairingLink(config.githubPagesUrl, server.ctx.token);
  console.log("");
  console.log("  RankStudio Engine running");
  console.log(`  URL:       http://${config.host}:${config.port}`);
  console.log(`  Data dir:  ${config.dataDir}`);
  console.log(`  SFX dir:   ${config.sfxDir}`);
  console.log(`  Gemini AI: ${server.ctx.geminiClient ? "enabled" : "disabled"}`);
  console.log(`  Pair code: ${server.ctx.token}`);
  console.log(`  Pair link: ${link}`);
  console.log("");

  const shutdown = async () => {
    await server.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Failed to start RankStudio Engine:", err);
  process.exit(1);
});
