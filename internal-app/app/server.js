import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import helmet from "helmet";
import { createAuth } from "./auth.js";
import { AUDIT_TYPES, AuditLimitError, JobManager } from "./jobs.js";
import { validateAuditUrl } from "./url-safety.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");

function createRateLimiter({ limit = 10, windowMs = 60 * 60 * 1000 } = {}) {
  const buckets = new Map();
  return (req, res, next) => {
    const key = req.user?.email || req.ip;
    const now = Date.now();
    const recent = (buckets.get(key) || []).filter((timestamp) => timestamp > now - windowMs);
    if (recent.length >= limit) {
      return res.status(429).json({ error: "Audit limit reached. Please try again later." });
    }
    recent.push(now);
    buckets.set(key, recent);
    return next();
  };
}

export async function createApp(options = {}) {
  const app = express();
  const auth = options.auth || createAuth();
  const jobs = options.jobs || new JobManager();
  await jobs.init();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use((_req, res, next) => {
    res.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    next();
  });
  app.use(express.json({ limit: "32kb" }));

  app.get("/healthz", (_req, res) => res.json({ ok: true }));
  app.use(auth);
  app.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });

  app.get("/api/config", (req, res) => {
    res.json({
      appName: process.env.APP_NAME || "eBuilderz SEO Audit",
      appDescription: process.env.APP_DESCRIPTION || "Evidence-led technical SEO audits for the internal team.",
      user: req.user.email,
      auditTypes: AUDIT_TYPES,
      costGuards: jobs.limits(),
    });
  });

  app.get("/api/audits", (_req, res) => res.json({ audits: jobs.list() }));

  app.get("/api/audits/:id", (req, res) => {
    const job = jobs.get(req.params.id);
    if (!job) return res.status(404).json({ error: "Audit not found." });
    return res.json({ audit: job });
  });

  app.get("/api/audits/:id/report", async (req, res, next) => {
    try {
      const job = jobs.get(req.params.id);
      if (!job) return res.status(404).json({ error: "Audit not found." });
      if (!job.reportAvailable) return res.status(409).json({ error: "The report is not ready yet." });
      const report = await jobs.readReport(req.params.id);
      if (req.query.download === "1") {
        res.set("Content-Disposition", `attachment; filename=seo-audit-${job.id}.md`);
      }
      return res.type("text/markdown; charset=utf-8").send(report);
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/audits", createRateLimiter(), async (req, res, next) => {
    try {
      const type = String(req.body?.type || "audit");
      if (!AUDIT_TYPES[type]) return res.status(400).json({ error: "Choose a supported audit type." });
      const url = await validateAuditUrl(req.body?.url);
      const job = await jobs.create({ url, type, requestedBy: req.user.email });
      return res.status(202).json({ audit: job });
    } catch (error) {
      if (error instanceof AuditLimitError) {
        return res.status(429).json({ error: error.message });
      }
      if (error instanceof Error && /URL|HTTP|port|network|address|audited|hostname|resolved/i.test(error.message)) {
        return res.status(400).json({ error: error.message });
      }
      return next(error);
    }
  });

  app.use(express.static(publicDir, { extensions: ["html"], maxAge: "1h" }));
  app.get("/*splat", (_req, res) => res.sendFile(path.join(publicDir, "index.html")));

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({ error: "The request could not be completed." });
  });

  return app;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  createApp()
    .then((app) => {
      app.listen(port, "0.0.0.0", () => console.log(`eBuilderz SEO Audit listening on ${port}`));
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
