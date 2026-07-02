import { getLatestAssets } from "../lib/assets.js";
import { sendJson } from "../lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    sendJson(res, 405, { ok: false, message: "Method not allowed." });
    return;
  }

  const assets = await getLatestAssets();
  sendJson(res, 200, { assets });
}
