# Private upstream host

This directory is the only hosting-specific addition on the `agent/upstream-live`
branch. Every upstream-owned file remains unchanged from `AgriciDaniel/claude-seo`.

The public project is an agent-skill repository, not a web server. This adapter
adds authenticated queueing, persistent report storage, safe Markdown rendering,
artifact downloads, Codex execution, and strict full-audit completion gates.

Full audits are published only when they include the upstream-required full
report, a substantive action plan, structured audit data, at least eight
specialist findings, valid desktop and mobile screenshots, all seven scored
categories, and at least 3,000 report words. An incomplete first pass receives
one automatic completion pass.

## Cost and security

- One audit runs at a time and rolling 24-hour limits are enforced.
- Multi-agent execution is enabled because the upstream full-audit workflow
  explicitly requires specialist delegation. Nesting is capped at one level.
- Web search is disabled; command networking is allowlisted to the audited host,
  Google evidence endpoints, and Common Crawl.
- The Codex API key is removed from model-launched subprocess environments.
- Production refuses to start without authentication and a Codex API key.
- Set a hard OpenAI project spending limit; application quotas are a secondary
  guard, not a financial guarantee.
