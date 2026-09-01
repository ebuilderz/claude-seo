import fs from "node:fs/promises";

const args = process.argv.slice(2);
const outputIndex = args.indexOf("--output-last-message");
if (outputIndex < 0 || !args[outputIndex + 1]) process.exit(2);
await fs.writeFile(args[outputIndex + 1], "# Short summary\n");
process.stdout.write(`${JSON.stringify({ type: "turn.completed", usage: {
  input_tokens: 100, cached_input_tokens: 0, output_tokens: 20, reasoning_output_tokens: 0,
} })}\n`);
