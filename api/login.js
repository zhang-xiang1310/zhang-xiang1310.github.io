import { createSessionToken, getAdminEmail, verifyCredentials } from "../lib/auth.js";
import { readJson, sendJson, serializeCookie } from "../lib/http.js";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "../lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, message: "Method not allowed." });
    return;
  }

  const body = await readJson(req).catch(() => null);
  const email = body?.email;
  const password = body?.password;

  if (!verifyCredentials(email, password)) {
    sendJson(res, 401, { ok: false, message: "Invalid credentials." });
    return;
  }

  const normalizedEmail = getAdminEmail().toLowerCase();

  res.setHeader(
    "Set-Cookie",
    serializeCookie(SESSION_COOKIE_NAME, createSessionToken(normalizedEmail), {
      httpOnly: true,
      sameSite: "Lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS
    })
  );

  sendJson(res, 200, { ok: true, email: normalizedEmail });
}
