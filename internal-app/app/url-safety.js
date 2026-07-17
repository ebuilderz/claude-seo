import dns from "node:dns/promises";
import ipaddr from "ipaddr.js";

const BLOCKED_RANGES = new Set([
  "unspecified",
  "broadcast",
  "multicast",
  "linkLocal",
  "loopback",
  "private",
  "reserved",
  "carrierGradeNat",
  "uniqueLocal",
  "ipv4Mapped",
  "rfc6145",
  "rfc6052",
  "6to4",
  "teredo",
]);

export function isPublicIp(address) {
  try {
    return !BLOCKED_RANGES.has(ipaddr.parse(address).range());
  } catch {
    return false;
  }
}

export async function validateAuditUrl(input, lookup = dns.lookup) {
  let url;
  try {
    url = new URL(String(input).trim());
  } catch {
    throw new Error("Enter a valid website URL, including https://.");
  }

  if (!new Set(["http:", "https:"]).has(url.protocol)) {
    throw new Error("Only HTTP and HTTPS websites can be audited.");
  }
  if (url.username || url.password) throw new Error("Website URLs cannot contain credentials.");

  const port = url.port || (url.protocol === "https:" ? "443" : "80");
  if (!new Set(["80", "443"]).has(port)) throw new Error("Only standard web ports 80 and 443 are allowed.");

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new Error("Local and private network addresses cannot be audited.");
  }

  let addresses;
  try {
    addresses = ipaddr.isValid(hostname)
      ? [{ address: hostname }]
      : await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error("The website hostname could not be resolved.");
  }

  if (!addresses.length || addresses.some(({ address }) => !isPublicIp(address))) {
    throw new Error("Local and private network addresses cannot be audited.");
  }

  url.hostname = hostname;
  url.hash = "";
  return url.toString();
}
