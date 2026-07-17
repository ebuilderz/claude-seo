import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { AuditLimitError, childEnvironment, JobManager } from "../app/jobs.js";

const fixture = fileURLToPath(new URL("./fixtures/fake-codex.js", import.meta.url));

async function createPluginFixture(root) {
  const plugin = path.join(root, "plugin");
  await fs.mkdir(path.join(plugin, "skills", "seo"), { recursive: true });
  await fs.mkdir(path.join(plugin, "skills", "seo-technical"), { recursive: true });
  await fs.writeFile(path.join(plugin, "AGENTS.md"), "# Test instructions\n");
  await fs.writeFile(path.join(plugin, "skills", "seo", "SKILL.md"), "# Router\n");
  await fs.writeFile(path.join(plugin, "skills", "seo-technical", "SKILL.md"), "# Technical\n");
  return plugin;
}

test("passes only the dedicated key and runtime essentials to Codex", () => {
  const env = childEnvironment({
    PATH: "/usr/bin",
    CODEX_API_KEY: "sk-test-not-a-real-key",
    BASIC_AUTH_PASSWORD: "must-not-leak",
    CF_ACCESS_AUD: "must-not-leak",
  }, "/tmp/job");
  assert.equal(env.CODEX_API_KEY, "sk-test-not-a-real-key");
  assert.equal(env.BASIC_AUTH_PASSWORD, undefined);
  assert.equal(env.CF_ACCESS_AUD, undefined);
  assert.equal(env.HOME, "/tmp/job");
});

test("persists a queued audit and its completed Codex report", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "seo-audit-test-"));
  try {
    const dataDir = path.join(root, "data");
    const pluginDir = await createPluginFixture(root);
    const customInstructions = path.join(root, "instructions.md");
    await fs.writeFile(customInstructions, "Use internal language.\n");

    const jobs = new JobManager({
      dataDir,
      pluginDir,
      customInstructions,
      overrideDir: path.join(root, "overrides"),
      codexBin: process.execPath,
      codexArgsPrefix: [fixture],
      env: { PATH: process.env.PATH, CODEX_API_KEY: "sk-test-not-a-real-key" },
      timeoutMs: 5_000,
    });
    await jobs.init();
    const created = await jobs.create({
      url: "https://example.com/",
      type: "technical",
      requestedBy: "tester@example.com",
    });

    let completed;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      completed = jobs.get(created.id);
      if (completed.status === "completed" || completed.status === "failed") break;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    assert.equal(completed.status, "completed", completed.error);
    assert.equal(completed.reportAvailable, true);
    assert.match(await jobs.readReport(created.id), /Fake SEO report/);

    const directory = path.join(dataDir, "audits", created.id);
    const metadata = JSON.parse(await fs.readFile(path.join(directory, "metadata.json"), "utf8"));
    assert.equal(metadata.requestedBy, "tester@example.com");

    const args = JSON.parse(await fs.readFile(path.join(directory, "workspace", "runner-args.json"), "utf8"));
    assert.ok(args.includes("--strict-config"));
    const config = await fs.readFile(path.join(directory, "workspace", "runner-config.toml"), "utf8");
    assert.match(config, /model = "gpt-5\.6-luna"/);
    assert.match(config, /model_reasoning_effort = "low"/);
    assert.match(config, /web_search = "disabled"/);
    assert.match(config, /default_permissions = "seo-audit"/);
    assert.match(config, /\[permissions\.seo-audit\.network\.domains\]/);
    assert.match(config, /"example\.com" = "allow"/);
    if (process.platform !== "win32") assert.match(config, /"\/proc\/\*\/environ" = "deny"/);
    assert.match(config, /exclude = \["CODEX_API_KEY"/);
    await assert.rejects(() => fs.access(path.join(directory, ".home")));
    assert.doesNotMatch(await fs.readFile(path.join(directory, "runner.jsonl"), "utf8"), /sk-test-not-a-real-key/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("enforces the rolling audit budget from persisted job metadata", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "seo-audit-limit-test-"));
  try {
    const dataDir = path.join(root, "data");
    const first = new JobManager({
      dataDir,
      env: { CODEX_API_KEY: "sk-test-not-a-real-key" },
      maxAuditsPer24Hours: 1,
      maxAuditsPerUser24Hours: 1,
      maxPendingAudits: 5,
    });
    first.runQueue = async () => {};
    await first.init();
    await first.create({
      url: "https://example.com/",
      type: "technical",
      requestedBy: "tester@example.com",
    });

    const restarted = new JobManager({
      dataDir,
      env: { CODEX_API_KEY: "sk-test-not-a-real-key" },
      maxAuditsPer24Hours: 1,
      maxAuditsPerUser24Hours: 1,
      maxPendingAudits: 5,
    });
    restarted.runQueue = async () => {};
    await restarted.init();
    await assert.rejects(
      () => restarted.create({
        url: "https://example.org/",
        type: "technical",
        requestedBy: "tester@example.com",
      }),
      AuditLimitError,
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
