import crypto from "node:crypto";
import { parseCookies } from "./http.js";

export const SESSION_COOKIE_NAME = "personal_intro_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const DEFAULT_ADMIN_EMAIL = "1403608175@qq.com";
const DEFAULT_ADMIN_PASSWORD = "zhangxiang1310";

function getAdminEmail() {
  return process.env.SITE_ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL;
}

function getAdminPassword() {
  return process.env.SITE_ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD;
}

function getSessionSecret() {
  return (
    process.env.SESSION_SECRET ??
    `${getAdminEmail()}:${getAdminPassword()}:personal-intro-site`
  );
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function signPayload(encodedPayload) {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(encodedPayload)
    .digest("base64url");
}

export function verifyCredentials(email, password) {
  if (typeof email !== "string" || typeof password !== "string") {
    return false;
  }

  return (
    safeEqual(email.trim().toLowerCase(), getAdminEmail().toLowerCase()) &&
    safeEqual(password, getAdminPassword())
  );
}

export function createSessionToken(email) {
  const now = Date.now();
  const payload = {
    email: email.trim().toLowerCase(),
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS * 1000
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url"
  );

  return `${encodedPayload}.${signPayload(encodedPayload)}`;
}

export function verifySessionToken(token) {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  if (!safeEqual(signature, signPayload(encodedPayload))) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    );

    if (payload.exp < Date.now()) {
      return null;
    }

    if (payload.email !== getAdminEmail().toLowerCase()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function readSession(req) {
  const cookies = parseCookies(req.headers.cookie || "");
  return verifySessionToken(cookies[SESSION_COOKIE_NAME]);
}

export { getAdminEmail };
