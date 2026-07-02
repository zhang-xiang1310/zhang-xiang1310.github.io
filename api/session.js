import { readSession } from "../lib/auth.js";
import { sendJson } from "../lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    sendJson(res, 405, { ok: false, message: "Method not allowed." });
    return;
  }

  const session = readSession(req);

  sendJson(res, 200, {
    authenticated: Boolean(session),
    email: session?.email ?? null
  });
}
