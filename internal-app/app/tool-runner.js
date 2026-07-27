import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const MAX_OUTPUT_BYTES = 1_000_000;

export const TOOL_DEFINITIONS = Object.freeze({
  "fetch-page": {
    name: "Fetch Page",
    description: "Fetch a URL and inspect headers, redirects, rendering, and raw HTML.",
    script: "fetch_page.py",
    input: "url",
    options: { render: ["never", "auto", "always"] },
    buildArgs: ({ url, options }) => [url, "--render", options.render || "never"],
  },
  "parse-html": {
    name: "Parse HTML",
    description: "Fetch a page and extract titles, metadata, headings, links, canonicals, and schema.",
    script: "parse_html.py",
    input: "url",
    pipeline: "fetch-and-parse",
  },
  pagespeed: {
    name: "PageSpeed & Core Web Vitals",
    description: "Run PageSpeed Insights and Chrome UX Report checks.",
    script: "pagespeed_check.py",
    input: "url",
    options: { strategy: ["mobile", "desktop", "both"] },
    buildArgs: ({ url, options }) => [url, "--strategy", options.strategy || "both", "--json"],
  },
  backlinks: {
    name: "Backlinks via Common Crawl",
    description: "Inspect public Common Crawl Web Graph backlink signals.",
    script: "commoncrawl_graph.py",
    input: "domain",
    buildArgs: ({ domain }) => [domain, "--top-referrers", "20", "--timeout", "45", "--json"],
  },
  "drift-baseline": {
    name: "SEO Drift — Set Baseline",
    description: "Store a page’s current SEO signals for later comparison.",
    script: "drift_baseline.py",
    input: "url",
    buildArgs: ({ url }) => [url, "--skip-cwv"],
  },
  "drift-compare": {
    name: "SEO Drift — Compare",
    description: "Compare a page with its most recent stored baseline.",
    script: "drift_compare.py",
    input: "url",
    buildArgs: ({ url }) => [url, "--skip-cwv"],
  },
  "drift-history": {
    name: "SEO Drift — History",
    description: "Show stored SEO changes and baseline history for a URL.",
    script: "drift_history.py",
    input: "url",
    buildArgs: ({ url }) => [url, "--limit", "20"],
  },
  moz: {
    name: "Moz Link Metrics",
    description: "Fetch authority, linking domains, anchors, or top pages from Moz.",
    script: "moz_api.py",
    input: "url",
    requiredEnv: "MOZ_API_KEY",
    options: { command: ["metrics", "domains", "anchors", "pages"] },
    buildArgs: ({ url, options }) => [options.command || "metrics", url, "--limit", "25", "--json"],
  },
  youtube: {
    name: "YouTube Search",
    description: "Search YouTube or inspect video and channel metadata.",
    script: "youtube_search.py",
    input: "query",
    requiredEnv: "GOOGLE_API_KEY",
    options: { command: ["search", "video", "channel"] },
    buildArgs: ({ query, options }) => [options.command || "search", query, "--limit", "10", "--json"],
  },
  nlp: {
    name: "NLP Analysis",
    description: "Analyze entities, sentiment, and content categories with Google Cloud NLP.",
    script: "nlp_analyze.py",
    input: "url",
    requiredEnv: "GOOGLE_API_KEY",
    buildArgs: ({ url }) => ["--url", url, "--features", "entities,sentiment,classify", "--json"],
  },
});

function publicDefinition(id, definition, env) {
  return {
    id,
    name: definition.name,
    description: definition.description,
    input: definition.input,
    options: definition.options || {},
    available: !definition.requiredEnv || Boolean(env[definition.requiredEnv]),
    requirement: definition.requiredEnv || null,
  };
}

function cleanInput(value, label, maxLength = 2_000) {
  const result = String(value || "").trim();
  if (!result) throw new Error(`Enter a ${label}.`);
  if (result.length > maxLength) throw new Error(`${label} is too long.`);
  if (/[\u0000-\u001f\u007f]/.test(result)) throw new Error(`${label} contains unsupported characters.`);
  return result;
}

function validateOptions(definition, submitted = {}) {
  const result = {};
  for (const [name, allowed] of Object.entries(definition.options || {})) {
    const value = submitted[name] == null ? allowed[0] : String(submitted[name]);
    if (!allowed.includes(value)) throw new Error(`Choose a supported ${name} option.`);
    result[name] = value;
  }
  return result;
}

function redact(value) {
  return String(value)
    .replace(/\b(?:sk|sess)-[a-zA-Z0-9_-]{16,}\b/g, "[redacted]")
    .replace(/\bAIza[0-9A-Za-z_-]+\b/g, "[redacted]");
}

export class ToolRunner {
  constructor(options = {}) {
    this.env = options.env || process.env;
    this.pluginDir = path.resolve(options.pluginDir || this.env.CLAUDE_SEO_PLUGIN_DIR || "..");
    this.dataDir = path.resolve(options.dataDir || this.env.DATA_DIR || "data");
    this.pythonBin = options.pythonBin || this.env.PYTHON_BIN || (process.platform === "win32" ? "python" : "python3");
    this.timeoutMs = Number(options.timeoutMs || this.env.TOOL_TIMEOUT_MS || 180_000);
    this.running = false;
  }

  list() {
    return Object.entries(TOOL_DEFINITIONS).map(([id, definition]) =>
      publicDefinition(id, definition, this.env));
  }

  async init() {
    await fs.mkdir(path.join(this.dataDir, "tool-runner"), { recursive: true, mode: 0o700 });
  }

  async run(id, input) {
    const definition = TOOL_DEFINITIONS[id];
    if (!definition) throw new Error("Choose a supported tool.");
    if (this.running) throw new Error("Another tool is already running. Wait for it to finish.");
    if (definition.requiredEnv && !this.env[definition.requiredEnv]) {
      throw new Error(`${definition.name} requires ${definition.requiredEnv} in the deployment environment.`);
    }

    const values = { options: validateOptions(definition, input?.options) };
    if (definition.input === "query") values.query = cleanInput(input?.query, "search query", 500);
    if (definition.input === "url") values.url = cleanInput(input?.url, "website URL");
    if (definition.input === "domain") values.domain = cleanInput(input?.domain, "domain", 253)
      .replace(/^https?:\/\//i, "").split("/")[0].replace(/^www\./i, "").toLowerCase();

    this.running = true;
    try {
      if (definition.pipeline === "fetch-and-parse") return await this.fetchAndParse(values.url);
      return await this.execute(definition.script, definition.buildArgs(values));
    } finally {
      this.running = false;
    }
  }

  async fetchAndParse(url) {
    const temporaryDir = await fs.mkdtemp(path.join(this.dataDir, "tool-runner", "parse-"));
    const htmlFile = path.join(temporaryDir, "page.html");
    try {
      await this.execute("fetch_page.py", [url, "--output", htmlFile, "--render", "auto"]);
      return await this.execute("parse_html.py", [htmlFile, "--url", url, "--json"]);
    } finally {
      await fs.rm(temporaryDir, { recursive: true, force: true });
    }
  }

  execute(script, args) {
    const scriptPath = path.join(this.pluginDir, "scripts", script);
    const home = path.join(this.dataDir, "tool-runner");
    const childEnv = {
      HOME: home,
      USERPROFILE: home,
      PATH: this.env.PATH,
      LANG: this.env.LANG || "C.UTF-8",
      PYTHONIOENCODING: "utf-8",
      PYTHONUTF8: "1",
      PYTHONUNBUFFERED: "1",
      NO_COLOR: "1",
    };
    if (process.platform === "win32") {
      for (const name of ["APPDATA", "LOCALAPPDATA", "SystemRoot", "TEMP", "TMP"]) {
        if (this.env[name]) childEnv[name] = this.env[name];
      }
    }
    for (const name of ["GOOGLE_API_KEY", "MOZ_API_KEY", "SSL_CERT_FILE", "PLAYWRIGHT_BROWSERS_PATH"]) {
      if (this.env[name]) childEnv[name] = this.env[name];
    }

    return new Promise((resolve, reject) => {
      const child = spawn(this.pythonBin, [scriptPath, ...args], {
        cwd: this.pluginDir,
        env: childEnv,
        shell: false,
        windowsHide: true,
      });
      let stdout = "";
      let stderr = "";
      let size = 0;
      let settled = false;
      let timer;

      const finish = (error, result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (error) reject(error);
        else resolve(result);
      };
      const collect = (target) => (chunk) => {
        size += chunk.length;
        if (size > MAX_OUTPUT_BYTES) {
          child.kill();
          finish(new Error("Tool output exceeded the 1 MB safety limit."));
          return;
        }
        if (target === "stdout") stdout += chunk;
        else stderr += chunk;
      };

      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", collect("stdout"));
      child.stderr.on("data", collect("stderr"));
      child.on("error", (error) => finish(new Error(`Tool could not start: ${error.message}`)));
      child.on("close", (code) => {
        const output = redact([stdout.trim(), stderr.trim()].filter(Boolean).join("\n\n"));
        if (code !== 0) finish(new Error(output || `Tool exited with status ${code}.`));
        else finish(null, { output: output || "Tool completed without output." });
      });
      timer = setTimeout(() => {
        child.kill();
        finish(new Error(`Tool exceeded the ${Math.ceil(this.timeoutMs / 1_000)}-second limit.`));
      }, this.timeoutMs);
    });
  }
}
