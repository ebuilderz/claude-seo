import fs from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const outputIndex = args.indexOf("--output-last-message");
if (outputIndex < 0 || !args[outputIndex + 1]) process.exit(2);

await fs.writeFile(path.join(process.cwd(), "runner-args.json"), `${JSON.stringify(args, null, 2)}\n`);
await fs.copyFile(path.join(process.env.CODEX_HOME, "config.toml"), path.join(process.cwd(), "runner-config.toml"));
await fs.writeFile(args[outputIndex + 1], "# Fake SEO report\n\nThe isolated Codex runner completed.\n");
process.stdout.write(`${JSON.stringify({
  type: "item.completed",
  item: { type: "agent_message", text: "# Fake SEO report" },
})}\n`);
