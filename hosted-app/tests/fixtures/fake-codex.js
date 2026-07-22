import fs from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const outputIndex = args.indexOf("--output-last-message");
if (outputIndex < 0 || !args[outputIndex + 1]) process.exit(2);

const root = path.join(process.cwd(), "example.com-audit");
await fs.mkdir(path.join(root, "findings"), { recursive: true });
await fs.mkdir(path.join(root, "screenshots"), { recursive: true });
const categoryNames = [
  "Technical SEO", "Content Quality", "On-Page SEO", "Schema / Structured Data",
  "Performance (CWV)", "AI Search Readiness", "Images",
];
const specialistNames = [...categoryNames, "Search Experience"];
for (const [index, name] of specialistNames.entries()) {
  await fs.writeFile(path.join(root, "findings", `${index + 1}-${name.toLowerCase().replace(/[^a-z]+/g, "-")}.md`), `# ${name}\n\n${"Evidence, impact, exact fix, owner, and verification step. ".repeat(170)}\n`);
}
const fakePng = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(2_048)]);
await fs.writeFile(path.join(root, "screenshots", "desktop.png"), fakePng);
await fs.writeFile(path.join(root, "screenshots", "mobile.png"), fakePng);
await fs.writeFile(path.join(root, "ACTION-PLAN.md"), `# Action plan\n\n${"Prioritized task with dependency, owner, effort, leading indicator, and verification. ".repeat(450)}\n`);
await fs.writeFile(path.join(root, "audit-data.json"), `${JSON.stringify({
  summary: { health_score: 81, business_type: "Test" },
  categories: categoryNames.map((name) => ({ name, score: 80, what_works: [], findings: [] })),
}, null, 2)}\n`);
await fs.writeFile(path.join(root, "FULL-AUDIT-REPORT.md"), `# Full audit\n\n${"Evidence-backed finding and verification step. ".repeat(3_200)}\n`);
await fs.writeFile(path.join(process.cwd(), "runner-args.json"), `${JSON.stringify(args, null, 2)}\n`);
await fs.copyFile(path.join(process.env.CODEX_HOME, "config.toml"), path.join(process.cwd(), "runner-config.toml"));
await fs.writeFile(args[outputIndex + 1], "# Audit complete\n\nArtifacts written.\n");
process.stdout.write(`${JSON.stringify({ type: "turn.completed", usage: {
  input_tokens: 1000, cached_input_tokens: 800, output_tokens: 200, reasoning_output_tokens: 20,
} })}\n`);
