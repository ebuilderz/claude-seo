import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../app/server.js";

function testJobs() {
  return {
    async init() {},
    limits() { return {}; },
    list() { return []; },
    get() { return null; },
  };
}

async function withServer(run) {
  const auth = (req, _res, next) => {
    req.user = { email: "tester@example.com", authMode: "test" };
    next();
  };
  const app = await createApp({ auth, jobs: testJobs() });
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
