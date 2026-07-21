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

test("requires correct basic credentials", async () => {
  const auth = createAuth({ env: {
    NODE_ENV: "production", AUTH_MODE: "basic", BASIC_AUTH_USER: "team", BASIC_AUTH_PASSWORD: "secret",
  } });
  assert.equal((await invoke(auth)).status, 401);
  assert.equal((await invoke(auth, { authorization: `Basic ${Buffer.from("team:wrong").toString("base64")}` })).status, 401);
  const allowed = await invoke(auth, { authorization: `Basic ${Buffer.from("team:secret").toString("base64")}` });
  assert.equal(allowed.next, true);
  assert.equal(allowed.req.user.email, "team");
});

test("cannot disable production authentication accidentally", () => {
  assert.throws(() => createAuth({ env: { NODE_ENV: "production", AUTH_MODE: "none" } }), /blocked/);
});
