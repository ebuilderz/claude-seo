import assert from "node:assert/strict";
import test from "node:test";
import { createAuth } from "../app/auth.js";

function invoke(middleware, headers = {}) {
  return new Promise((resolve) => {
    const req = { get: (name) => headers[name.toLowerCase()] };
    const response = {
      statusCode: 200,
      headers: {},
      set(name, value) { this.headers[name] = value; return this; },
      status(code) { this.statusCode = code; return this; },
      json(body) { resolve({ next: false, status: this.statusCode, body, req }); },
    };
    middleware(req, response, () => resolve({ next: true, status: 200, req }));
  });
}

test("blocks unauthenticated basic auth and accepts correct credentials", async () => {
  const middleware = createAuth({
    env: { NODE_ENV: "production", AUTH_MODE: "basic", BASIC_AUTH_USER: "team", BASIC_AUTH_PASSWORD: "secret" },
  });
  const denied = await invoke(middleware);
  assert.equal(denied.status, 401);

  const authorization = `Basic ${Buffer.from("team:secret").toString("base64")}`;
  const allowed = await invoke(middleware, { authorization });
  assert.equal(allowed.next, true);
  assert.equal(allowed.req.user.email, "team");
});

test("does not allow production authentication to be disabled accidentally", () => {
  assert.throws(() => createAuth({ env: { NODE_ENV: "production", AUTH_MODE: "none" } }), /blocked/);
});
