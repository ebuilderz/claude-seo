import assert from "node:assert/strict";
import test from "node:test";
import { isPublicIp, validateAuditUrl } from "../app/url-safety.js";

test("recognizes public and private IP ranges", () => {
  assert.equal(isPublicIp("8.8.8.8"), true);
  assert.equal(isPublicIp("127.0.0.1"), false);
  assert.equal(isPublicIp("10.0.0.1"), false);
  assert.equal(isPublicIp("169.254.169.254"), false);
  assert.equal(isPublicIp("::1"), false);
});

test("normalizes a public audit URL", async () => {
  const lookup = async () => [{ address: "93.184.216.34", family: 4 }];
  assert.equal(await validateAuditUrl("https://Example.com/path#fragment", lookup), "https://example.com/path");
});

test("rejects unsafe audit targets", async () => {
  await assert.rejects(() => validateAuditUrl("https://user:pass@example.com"), /credentials/);
  await assert.rejects(() => validateAuditUrl("https://example.com:8443"), /ports/);
  await assert.rejects(() => validateAuditUrl("file:///etc/passwd"), /HTTP/);
  await assert.rejects(() => validateAuditUrl("https://intranet.example", async () => [{ address: "192.168.1.2" }] ), /private/);
});
