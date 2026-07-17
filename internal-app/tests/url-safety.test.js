import assert from "node:assert/strict";
import test from "node:test";
import { isPublicIp, validateAuditUrl } from "../app/url-safety.js";

test("recognizes public and private IP ranges", () => {
  assert.equal(isPublicIp("8.8.8.8"), true);
  assert.equal(isPublicIp("127.0.0.1"), false);
  assert.equal(isPublicIp("10.0.0.1"), false);
  assert.equal(isPublicIp("169.254.169.254"), false);
  assert.equal(isPublicIp("::1"), false);
  assert.equal(isPublicIp("2606:4700:4700::1111"), true);
});

test("normalizes a public audit URL", async () => {
  const lookup = async () => [{ address: "93.184.216.34", family: 4 }];
  assert.equal(await validateAuditUrl("https://Example.com/path#fragment", lookup), "https://example.com/path");
});

test("rejects credentials, non-web ports, private resolution, and DNS errors", async () => {
  await assert.rejects(() => validateAuditUrl("https://user:pass@example.com"), /credentials/);
  await assert.rejects(() => validateAuditUrl("https://example.com:8443"), /ports/);
  const privateLookup = async () => [{ address: "192.168.1.20", family: 4 }];
  await assert.rejects(() => validateAuditUrl("https://intranet.example", privateLookup), /private/);
  const failedLookup = async () => { throw new Error("DNS failure"); };
  await assert.rejects(() => validateAuditUrl("https://missing.example", failedLookup), /resolved/);
});
