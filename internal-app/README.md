# eBuilderz SEO Audit

Private, Coolify-ready web access to the SEO workflows in this repository. Team members submit a public website and audit type, the service runs the selected workflow through OpenAI Codex, and the Markdown report is retained in a private volume.

The upstream project is an agent skill collection rather than a web application. This directory supplies the authenticated UI, queue, Codex runner, report storage, container, and update automation.

## Update-safe repository layout

Upstream-owned files remain at the repository root. All eBuilderz application code lives under `internal-app/`, and report personalization lives under `internal-app/custom/`.

The scheduled `Sync upstream Claude SEO` workflow fetches `AgricIDaniel/claude-seo`, merges it into `automation/upstream-sync`, and opens a draft pull request. It never pushes an upstream merge directly to `main`. If Git reports a conflict, the workflow fails for manual review instead of choosing a side or discarding a customization.

Normal update flow:

1. Review the automated draft pull request and upstream changelog.
2. Wait for the upstream Python checks and internal Node checks.
3. Merge the pull request.
4. Let Coolify redeploy `main`.

Do not put secrets in `custom/instructions.md`; this GitHub repository is public. Deployment secrets belong only in Coolify.

## Codex and security boundaries

- A dedicated `CODEX_API_KEY` is passed only to one non-interactive `codex exec` process per audit.
- Codex runs ephemerally in a per-job least-privilege permission profile. Only that workspace and temporary browser storage are writable.
- The Codex shell policy strips API keys, tokens, secrets, passwords, and application auth values from model-launched subprocesses.
- Command networking uses Codex's allowlist-first network proxy. It permits the audited hostname, its `www` peer/subdomains, and the Google endpoints used for PageSpeed and Chrome UX evidence. Local and private destinations stay blocked.
- Process environments and `/run/secrets` are denied to model-launched commands, closing off indirect reads of the parent application's key.
- Submitted URLs are restricted to public IPs and ports 80/443 before a job is queued.
- The container runs as an unprivileged user. It receives no database, Docker socket, SSH, or server-management credentials.
- Audited website content is explicitly treated as untrusted data rather than instructions.
- Production refuses to start with authentication disabled or without a Codex key.
- All application and report routes require authentication; `/healthz` exposes only `{ "ok": true }`.
- Responses send `noindex`, `nofollow`, and `noarchive` directives.

Use a dedicated OpenAI project and project-level spend limit for this service. A timeout limits each audit's wall-clock runtime, but billing limits must be enforced in the OpenAI project.

## Authentication

Cloudflare Access is the recommended production mode. Create a self-hosted Access application for `audit.abletest.in`, allow only the team domain or named accounts, and set:

```env
AUTH_MODE=cloudflare-access
CF_TEAM_DOMAIN=https://YOUR-TEAM.cloudflareaccess.com
CF_ACCESS_AUD=YOUR-APPLICATION-AUDIENCE-TAG
ALLOWED_EMAIL_DOMAINS=your-company.com
ALLOWED_EMAILS=
```

The origin validates the Access JWT signature, issuer, audience, and optional identity allowlist. A direct request that bypasses the login is rejected.

HTTP Basic auth is available as a temporary fallback:

```env
AUTH_MODE=basic
BASIC_AUTH_USER=seo-team
BASIC_AUTH_PASSWORD=use-a-long-random-secret
```

## Local verification

From `internal-app/`:

```bash
npm ci
npm run check
npm test
```

For a container smoke test, copy `coolify.env.example` to `.env`, enable Basic auth, add a dedicated Codex key, and run:

```bash
docker compose up --build
```

Open `http://localhost:3000`.

## Coolify deployment

Create an application from `ebuilderz/claude-seo` with these settings:

- Branch: `main`
- Build pack: Dockerfile
- Base directory: `/`
- Dockerfile: `/internal-app/Dockerfile`
- Exposed port: `3000`
- Domain: `https://audit.abletest.in`
- Health check: `/healthz`
- Persistent volume destination: `/app/data`

Add the values from `coolify.env.example` as runtime variables. Mark `CODEX_API_KEY`, `CF_ACCESS_AUD`, and any Basic password as secrets. Enable automatic deployment from `main` only after the initial pull request has been reviewed.

The image installs Chromium and the upstream Python dependencies, so its first build is larger and slower than a normal Node service.

## Personalizing reports

Edit `custom/instructions.md` for report structure, terminology, scoring, ownership, and quality rules. It is appended to each audit and is not touched by normal upstream merges.

If a skill-level fork is unavoidable, put only the replacement file under `custom/skill-overrides/` with the same repository-relative path. Overrides are copied over the upstream files inside each disposable job workspace. Keep overrides small and review them whenever upstream changes the same skill.

## Operational limits

- One audit may be queued or running at a time.
- The default Codex model is GPT-5.6 Luna with low reasoning and web search disabled.
- The workspace accepts at most 3 audits in a rolling 24-hour period and at most 2 per user.
- Each audit has a 15-minute process timeout and a 2,500-word report target.
- These application limits complement, but do not replace, a hard spend limit on the dedicated OpenAI project.
- Restarted in-progress audits are marked failed and can be submitted again.
- Up to 100 recent audit records are listed in the UI; reports remain on the persistent volume.
- Reports are Markdown. PDF export and task-tracker integration are not included yet.
- Optional Search Console, Analytics, Ads, and third-party SEO credentials are deliberately not exposed to the runner. Add them later through narrowly scoped credential handling, not shared environment variables.
