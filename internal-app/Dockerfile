# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim

ARG CODEX_VERSION=0.144.5

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      bubblewrap \
      ca-certificates \
      curl \
      git \
      libharfbuzz-subset0 \
      libjpeg62-turbo \
      libopenjp2-7 \
      libpango-1.0-0 \
      libpangoft2-1.0-0 \
      python3 \
      python3-pip \
      python3-venv \
    && rm -rf /var/lib/apt/lists/*

RUN npm install --global "@openai/codex@${CODEX_VERSION}"

WORKDIR /app
COPY internal-app/package.json internal-app/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

WORKDIR /opt/claude-seo
COPY AGENTS.md CLAUDE.md README.md LICENSE requirements.txt pyproject.toml ./
COPY agents ./agents
COPY data ./data
COPY extensions ./extensions
COPY hooks ./hooks
COPY pdf ./pdf
COPY schema ./schema
COPY scripts ./scripts
COPY skills ./skills

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN python3 -m venv /opt/claude-seo/.venv \
    && /opt/claude-seo/.venv/bin/pip install --no-cache-dir --requirement /opt/claude-seo/requirements.txt \
    && /opt/claude-seo/.venv/bin/python -m playwright install --with-deps chromium \
    && chmod -R a-w /opt/claude-seo /ms-playwright

WORKDIR /app
COPY internal-app/app ./app
COPY internal-app/public ./public
COPY internal-app/custom ./custom

RUN mkdir -p /app/data \
    && chown -R node:node /app/data

ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/app/data \
    CLAUDE_SEO_PLUGIN_DIR=/opt/claude-seo \
    CUSTOM_INSTRUCTIONS_FILE=/app/custom/instructions.md \
    CUSTOM_OVERRIDE_DIR=/app/custom/skill-overrides \
    PATH=/opt/claude-seo/.venv/bin:$PATH

USER node
EXPOSE 3000
VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl --fail --silent http://127.0.0.1:3000/healthz || exit 1

CMD ["node", "app/server.js"]
