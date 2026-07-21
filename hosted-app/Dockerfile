# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim

ARG CODEX_VERSION=0.144.6

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      apparmor-utils bubblewrap ca-certificates curl git libharfbuzz-subset0 \
      libjpeg62-turbo libopenjp2-7 libpango-1.0-0 libpangoft2-1.0-0 \
      python3 python3-pip python3-venv util-linux \
    && rm -rf /var/lib/apt/lists/*

RUN npm install --global "@openai/codex@${CODEX_VERSION}"

COPY hosted-app/bin/bwrap /usr/local/bin/bwrap
COPY hosted-app/bin/entrypoint /usr/local/bin/claude-seo-entrypoint
RUN chmod 0755 /usr/local/bin/bwrap /usr/local/bin/claude-seo-entrypoint

WORKDIR /opt/claude-seo
COPY .claude-plugin ./.claude-plugin
COPY AGENTS.md CLAUDE.md README.md LICENSE requirements.txt pyproject.toml ./
COPY agents ./agents
COPY bin ./bin
COPY data ./data
COPY docs ./docs
COPY extensions ./extensions
COPY hooks ./hooks
COPY pdf ./pdf
COPY schema ./schema
COPY scripts ./scripts
COPY skills ./skills

ENV CLAUDE_SEO_DATA_DIR=/opt/claude-seo-runtime
RUN ./bin/claude-seo setup \
    && /opt/claude-seo-runtime/.venv/bin/python -m playwright install --with-deps chromium \
    && chmod -R a-w /opt/claude-seo /opt/claude-seo-runtime

WORKDIR /app
COPY hosted-app/package.json hosted-app/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY hosted-app/app ./app
COPY hosted-app/public ./public
RUN mkdir -p /app/data/upstream-live && chown -R node:node /app/data

ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/app/data/upstream-live \
    CLAUDE_SEO_PLUGIN_DIR=/opt/claude-seo \
    PATH=/opt/claude-seo/bin:/opt/claude-seo-runtime/.venv/bin:$PATH \
    UPSTREAM_VERSION=v2.2.4

USER node
EXPOSE 3000
VOLUME ["/app/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD curl --fail --silent http://127.0.0.1:3000/healthz || exit 1
ENTRYPOINT ["/usr/local/bin/claude-seo-entrypoint"]
CMD ["node", "app/server.js"]
