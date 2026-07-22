import crypto from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";

function splitList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function reject(res, status = 401, message = "Authentication required.") {
  return res.status(status).json({ error: message });
}

function allowedIdentity(email, allowedEmails, allowedDomains) {
  if (!email) return false;
  const normalized = email.toLowerCase();
  if (!allowedEmails.length && !allowedDomains.length) return true;
  return allowedEmails.includes(normalized) || allowedDomains.includes(normalized.split("@").at(-1));
}

export function createAuth(options = {}) {
  const env = options.env || process.env;
  const production = env.NODE_ENV === "production";
  const mode = String(env.AUTH_MODE || (production ? "basic" : "none")).toLowerCase();

  if (mode === "none" && production && env.ALLOW_UNSAFE_NO_AUTH !== "true") {
    throw new Error("AUTH_MODE=none is blocked in production.");
  }

  if (mode === "basic") {
    const expectedUser = env.BASIC_AUTH_USER;
    const expectedPassword = env.BASIC_AUTH_PASSWORD;
    if (!expectedUser || !expectedPassword) {
      throw new Error("BASIC_AUTH_USER and BASIC_AUTH_PASSWORD are required for basic auth.");
    }

    return (req, res, next) => {
      const header = req.get("authorization") || "";
      if (!header.startsWith("Basic ")) {
        res.set("WWW-Authenticate", 'Basic realm="Claude SEO Audit", charset="UTF-8"');
        return reject(res);
      }

      let credentials;
      try {
        credentials = Buffer.from(header.slice(6), "base64").toString("utf8");
      } catch {
        return reject(res);
      }
      const separator = credentials.indexOf(":");
      const user = separator >= 0 ? credentials.slice(0, separator) : "";
      const password = separator >= 0 ? credentials.slice(separator + 1) : "";
      if (!safeEqual(user, expectedUser) || !safeEqual(password, expectedPassword)) return reject(res);

      req.user = { email: user, authMode: "basic" };
      return next();
    };
  }

  if (mode === "cloudflare-access") {
    const teamDomain = String(env.CF_TEAM_DOMAIN || "").replace(/\/$/, "");
    const audience = env.CF_ACCESS_AUD;
    if (!teamDomain || !audience) {
      throw new Error("CF_TEAM_DOMAIN and CF_ACCESS_AUD are required for Cloudflare Access auth.");
    }
    const issuer = teamDomain.startsWith("https://") ? teamDomain : `https://${teamDomain}`;
    const jwks = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
    const allowedEmails = splitList(env.ALLOWED_EMAILS);
    const allowedDomains = splitList(env.ALLOWED_EMAIL_DOMAINS);

    return async (req, res, next) => {
      const token = req.get("cf-access-jwt-assertion");
      if (!token) return reject(res);
      try {
        const { payload } = await jwtVerify(token, jwks, { audience, issuer });
        const email = String(payload.email || "").toLowerCase();
        if (!allowedIdentity(email, allowedEmails, allowedDomains)) {
          return reject(res, 403, "This account is not allowed to use the audit workspace.");
        }
        req.user = { email, authMode: "cloudflare-access", subject: payload.sub };
        return next();
      } catch {
        return reject(res, 401, "Your access session is missing or expired.");
      }
    };
  }

  if (mode === "none") {
    return (req, _res, next) => {
      req.user = { email: "local-development", authMode: "none" };
      next();
    };
  }

  throw new Error(`Unsupported AUTH_MODE: ${mode}`);
}
