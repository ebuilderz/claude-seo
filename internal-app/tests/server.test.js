import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../app/server.js";

function testJobs() {
  return {
    async init() {},
    auditAvailable() { return true; },
    limits() { return {}; },
    list() { return []; },
    get() { return null; },
  };
}

function testTools() {
  return {
    async init() {},
    list() {
      return [{
        id: "fetch-page",
        name: "Fetch Page",
        description: "Fetch a page.",
        input: "url",
        options: {},
        available: true,
        requirement: null,
      }];
    },
    async run(id, payload) {
      return { output: `${id}:${payload.url}` };
    },
  };
}

async function withServer(run) {
  const auth = (req, _res, next) => {
    req.user = { email: "tester@example.com", authMode: "test" };
    next();
  };
  const app = await createApp({ auth, jobs: testJobs(), tools: testTools() });
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  });
  try {
    const address = server.address();
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("returns a client error for malformed JSON", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/audits`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: '{"url":',
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "Request body must be valid JSON." });
  });
});

test("returns JSON 404 for unknown API routes", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/not-a-route`);
    assert.equal(response.status, 404);
    assert.match(response.headers.get("content-type"), /^application\/json/);
    assert.deepEqual(await response.json(), { error: "API route not found." });
  });
});

test("runs only registered tools with validated public URLs", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/tools/fetch-page/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: "https://example.com/" }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { output: "fetch-page:https://example.com/" });
  });
});
