
import express from "express";
import {
  randomBytes,
  createHmac,
  timingSafeEqual,
  scrypt as scryptCallback
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const router = express.Router();

const COOKIE_NAME = "ultron_admin";
const SESSION_HOURS = 12;

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters.");
  }
  return secret;
}

async function verifyPassword(password, storedHash) {
  if (!storedHash || typeof password !== "string") return false;

  const [salt, expected] = storedHash.split(":");
  if (!salt || !expected || !/^[a-f0-9]{128}$/i.test(expected)) {
    return false;
  }

  const actual = await scrypt(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, "hex");

  return timingSafeEqual(actual, expectedBuffer);
}

function sign(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", getSecret())
    .update(data)
    .digest("base64url");

  return `${data}.${signature}`;
}

function verifyToken(token) {
  try {
    const [data, signature] = token.split(".");
    if (!data || !signature) return null;

    const expected = createHmac("sha256", getSecret())
      .update(data)
      .digest();

    const actual = Buffer.from(signature, "base64url");

    if (
      actual.length !== expected.length ||
      !timingSafeEqual(actual, expected)
    ) return null;

    const payload = JSON.parse(
      Buffer.from(data, "base64url").toString()
    );

    if (payload.exp < Date.now()) return null;
    if (payload.role !== "admin") return null;

    return payload;
  } catch {
    return null;
  }
}

function getCookie(req) {
  const cookies = req.headers.cookie || "";
  const item = cookies.split(";").find(c =>
    c.trim().startsWith(COOKIE_NAME + "=")
  );

  return item ? decodeURIComponent(
    item.trim().slice(COOKIE_NAME.length + 1)
  ) : null;
}

export function requireAdmin(req, res, next) {
  try {
    const token = getCookie(req);
    const session = token && verifyToken(token);

    if (!session) {
      return res.status(401).json({
        error: "Admin authentication required."
      });
    }

    req.admin = { email: session.email };
    next();
  } catch {
    res.status(401).json({ error: "Invalid session." });
  }
}

// ADMIN LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      email.length > 254 ||
      password.length > 200
    ) {
      return res.status(400).json({
        error: "Valid email and password required."
      });
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const passwordHash = process.env.ADMIN_PASSWORD_HASH;

    if (!adminEmail || !passwordHash) {
      return res.status(503).json({
        error: "Admin credentials are not configured."
      });
    }

    const emailOK =
      email.trim().toLowerCase() === adminEmail.trim().toLowerCase();

    const passwordOK = await verifyPassword(
      password,
      passwordHash
    );

    if (!emailOK || !passwordOK) {
      return res.status(401).json({
        error: "Incorrect email or password."
      });
    }

    const token = sign({
      email: adminEmail,
      role: "admin",
      exp: Date.now() + SESSION_HOURS * 60 * 60 * 1000
    });

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_HOURS * 60 * 60 * 1000
    });

    res.json({
      success: true,
      message: "ULTRON Admin Login successful."
    });
  } catch (error) {
    console.error("AUTH ERROR:", error.message);
    res.status(500).json({ error: "Authentication failed." });
  }
});

// CHECK ADMIN SESSION
router.get("/me", requireAdmin, (req, res) => {
  res.json({
    authenticated: true,
    role: "admin",
    email: req.admin.email
  });
});

// ADMIN LOGOUT
router.post("/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/"
  });

  res.json({ success: true, message: "Logged out." });
});

export default router;
    
