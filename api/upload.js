import { getAdminEmail, readSession } from "../lib/auth.js";
import { isUploadSlot } from "../lib/slots.js";
import { readBody, sendJson } from "../lib/http.js";
import { saveUploadedAsset } from "../lib/assets.js";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml"
]);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, message: "Method not allowed." });
    return;
  }

  const session = readSession(req);

  if (!session) {
    sendJson(res, 401, { ok: false, message: "Unauthorized." });
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const slot = url.searchParams.get("slot");
  const fileName = req.headers["x-file-name"] || "upload";
  const contentType = req.headers["content-type"] || "";

  if (!isUploadSlot(slot)) {
    sendJson(res, 400, { ok: false, message: "Invalid slot." });
    return;
  }

  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    sendJson(res, 415, { ok: false, message: "Only image files are supported." });
    return;
  }

  const buffer = await readBody(req);

  if (!buffer.length) {
    sendJson(res, 400, { ok: false, message: "Missing file." });
    return;
  }

  if (buffer.length > MAX_UPLOAD_BYTES) {
    sendJson(res, 413, { ok: false, message: "File is too large." });
    return;
  }

  const asset = await saveUploadedAsset(slot, buffer, {
    filename: String(fileName),
    contentType
  });

  sendJson(res, 200, {
    ok: true,
    asset,
    admin: getAdminEmail()
  });
}
