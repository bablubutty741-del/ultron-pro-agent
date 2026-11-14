
import crypto from "node:crypto";

// ULTRON PRO SECURITY SYSTEM

const requests = new Map();

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 60;

export function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), geolocation=()");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");

  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }

  next();
}

export function rateLimit(req, res, next) {
  const now = Date.now();
  const ip = req.ip || req.socket.remoteAddress || "unknown";

  let entry = requests.get(ip);

  if (!entry || now - entry.start >= WINDOW_MS) {
    entry = { start: now, count: 0 };
  }

  entry.count++;
  requests.set(ip, entry);

  if (entry.count > MAX_REQUESTS) {
    return res.status(429).json({
      error: "Too many requests. Please try again later."
    });
  }

  res.setHeader(
    "X-RateLimit-Limit",
    String(MAX_REQUESTS)
  );

  res.setHeader(
    "X-RateLimit-Remaining",
    String(Math.max(0, MAX_REQUESTS - entry.count))
  );

  next();
}

// Prevent oversized or invalid request bodies
export function validateRequest(req, res, next) {
  if (
    req.body &&
    typeof req.body !== "object"
  ) {
    return res.status(400).json({
      error: "Invalid request body."
    });
  }

  next();
}

// Secure random request ID
export function requestId(req, res, next) {
  req.requestId = crypto.randomUUID();

  res.setHeader("X-Request-ID", req.requestId);

  next();
}

// Clear expired rate-limit records periodically
export function cleanupSecurity() {
  const now = Date.now();

  for (const [ip, entry] of requests.entries()) {
    if (now - entry.start >= WINDOW_MS) {
      requests.delete(ip);
    }
  }
