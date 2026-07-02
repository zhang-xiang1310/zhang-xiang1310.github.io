import { SESSION_COOKIE_NAME } from "../lib/auth.js";
import { sendJson, serializeCookie } from "../lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, message: "Method not allowed." });
    return;
  }

  res.setHeader(
    "Set-Cookie",
    serializeCookie(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      sameSite: "Lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0
    })
  );

  sendJson(res, 200, { ok: true });
}
