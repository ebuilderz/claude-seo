import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { AuditLimitError, childEnvironment, codexConfig, JobManager } from "../app/jobs.js";

const completeFixture = fileURLToPath(new URL("./fixtures/fake-codex.js", import.meta.url));
const incompleteFixture = fileURLToPath(new URL("./fixtures/incomplete-codex.js", import.meta.url));

async function pluginFixture(root) {
  const plugin = path.join(root, "plugin");
  await fs.mkdir(path.join(plugin, "skills", "seo"), { recursive: true });
  await fs.mkdir(path.join(plugin, "skills", "seo-audit"), { recursive: true });
  await fs.writeFile(path.join(plugin, "AGENTS.md"), "# Instructions\n");
  await fs.writeFile(path.join(plugin, "skills", "seo", "SKILL.md"), "# Router\n");
  await fs.writeFile(path.join(plugin, "skills", "seo-audit", "SKILL.md"), "# Full audit\n");
  return plugin;
}

async function waitFor(jobs, id) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const job = jobs.get(id);
    if (["completed", "failed"].includes(job.status)) return job;
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
  throw new Error("job did not finish");
}

test("keeps secrets out of model-launched commands", () => {
  const result = childEnvironment({
    PATH: "/usr/bin",
    CODEX_API_KEY: "sk-test-not-real",
    BASIC_AUTH_PASSWORD: "hidden",
    CF_ACCESS_AUD: "hidden",
  }, "/tmp/job");
  assert.equal(result.CODEX_API_KEY, "sk-test-not-real");
  assert.equal(result.BASIC_AUTH_PASSWORD, undefined);
  assert.equal(result.CF_ACCESS_AUD, undefined);
  assert.equal(result.CLAUDE_SEO_DATA_DIR, "/opt/claude-seo-runtime");
});

test("enables bounded multi-agent execution in the hardened audit profile", () => {
  const config = codexConfig("gpt-5.6-luna", "medium", "example.com", "linux");
  assert.match(config, /\[features\]\nmulti_agent = true/);
  assert.match(config, /\[agents\]\nmax_threads = 8\nmax_depth = 1/);
  assert.match(config, /default_permissions = "seo-audit"/);
  assert.match(config, /"example\.com" = "allow"/);
  assert.match(config, /"\/proc" = "read"/);
  assert.match(config, /exclude = \["CODEX_API_KEY"/);
});

test("seccomp permits the inner sandbox namespaces while denying by default", async () => {
  const profile = JSON.parse(await fs.readFile(new URL("../../seoaudit.json", import.meta.url), "utf8"));
  const launcher = await fs.readFile(new URL("../bin/bwrap", import.meta.url), "utf8");
  assert.equal(profile.defaultAction, "SCMP_ACT_ERRNO");
  const namespaceRule = profile.syscalls.find((rule) =>
    rule.action === "SCMP_ACT_ALLOW" && ["clone", "mount", "setns", "unshare"].every((name) => rule.names.includes(name))
  );
  assert.ok(namespaceRule, "bubblewrap namespace syscalls must be explicitly allowed");
  const unconditionalBpf = profile.syscalls.find((rule) =>
    rule.action === "SCMP_ACT_ALLOW" && rule.names.includes("bpf") && !rule.includes?.caps
  );
  assert.equal(unconditionalBpf, undefined);
  assert.match(launcher, /exec \/usr\/bin\/bwrap "\$@"/);
  assert.doesNotMatch(launcher, /aa-exec/);
});

test("publishes a full audit only after all upstream artifacts pass", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "upstream-host-test-"));
  try {
    const jobs = new JobManager({
      dataDir: path.join(root, "data"),
      pluginDir: await pluginFixture(root),
      codexBin: process.execPath,
      codexArgsPrefix: [completeFixture],
      env: { PATH: process.env.PATH, CODEX_API_KEY: "sk-test-not-real" },
      timeoutMs: 5_000,
    });
    await jobs.init();
    const created = await jobs.create({ url: "https://example.com/", type: "audit", requestedBy: "team" });
    const completed = await waitFor(jobs, created.id);
    assert.equal(completed.status, "completed", completed.error);
    assert.equal(completed.completion.categories, 7);
    assert.equal(completed.completion.findingFiles, 8);
    assert.equal(completed.completion.screenshots, 2);
    assert.ok(completed.completion.reportWords >= 3_000);
    assert.equal(completed.usage.inputTokens, 1000);
    assert.match(await jobs.readReport(created.id), /Evidence-backed finding/);

    const artifacts = await jobs.listArtifacts(created.id);
    assert.ok(artifacts.some((artifact) => artifact.path === "FULL-AUDIT-REPORT.md"));
    assert.ok(await jobs.artifactPath(created.id, "ACTION-PLAN.md"));
    assert.equal(await jobs.artifactPath(created.id, "../metadata.json"), null);

    const workspace = path.join(root, "data", "audits", created.id, "workspace");
    const args = JSON.parse(await fs.readFile(path.join(workspace, "runner-args.json"), "utf8"));
    assert.ok(args.includes("--strict-config"));
    const config = await fs.readFile(path.join(workspace, "runner-config.toml"), "utf8");
    assert.match(config, /multi_agent = true/);
    await assert.rejects(() => fs.access(path.join(root, "data", "audits", created.id, ".home")));
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("fails closed after two incomplete full-audit passes", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "upstream-host-incomplete-"));
  try {
    const jobs = new JobManager({
      dataDir: path.join(root, "data"),
      pluginDir: await pluginFixture(root),
      codexBin: process.execPath,
      codexArgsPrefix: [incompleteFixture],
      env: { PATH: process.env.PATH, CODEX_API_KEY: "sk-test-not-real" },
      timeoutMs: 5_000,
      maxCompletionPasses: 2,
    });
    await jobs.init();
    const created = await jobs.create({ url: "https://example.com/", type: "audit", requestedBy: "team" });
    const failed = await waitFor(jobs, created.id);
    assert.equal(failed.status, "failed");
    assert.match(failed.error, /FULL-AUDIT-REPORT\.md is missing/);
    assert.equal(failed.reportAvailable, false);
    assert.equal(failed.usage.inputTokens, 200);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("enforces persisted rolling limits", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "upstream-host-limit-"));
  try {
    const options = {
      dataDir: path.join(root, "data"),
      env: { CODEX_API_KEY: "sk-test-not-real" },
      maxAuditsPer24Hours: 1,
      maxAuditsPerUser24Hours: 1,
      maxPendingAudits: 5,
    };
    const first = new JobManager(options);
    first.runQueue = async () => {};
    await first.init();
    await first.create({ url: "https://example.com/", type: "audit", requestedBy: "team" });
    const restarted = new JobManager(options);
    restarted.runQueue = async () => {};
    await restarted.init();
    await assert.rejects(
      () => restarted.create({ url: "https://example.org/", type: "audit", requestedBy: "team" }),
      AuditLimitError,
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
