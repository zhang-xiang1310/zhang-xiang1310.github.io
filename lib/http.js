export function parseCookies(cookieHeader = "") {
  return cookieHeader.split(";").reduce((cookies, part) => {
    const [rawName, ...rawValueParts] = part.trim().split("=");
    if (!rawName) {
      return cookies;
    }

    cookies[decodeURIComponent(rawName)] = decodeURIComponent(
      rawValueParts.join("=") || ""
    );
    return cookies;
  }, {});
}

export function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export async function readJson(req) {
  const body = await readBody(req);

  if (!body.length) {
    return {};
  }

  return JSON.parse(body.toString("utf8"));
}

export function sendJson(res, status, data, extraHeaders = {}) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  for (const [key, value] of Object.entries(extraHeaders)) {
    res.setHeader(key, value);
  }

  res.end(JSON.stringify(data));
}

export function serializeCookie(name, value, options = {}) {
  const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];

  if (options.maxAge != null) parts.push(`Max-Age=${options.maxAge}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.secure) parts.push("Secure");

  return parts.join("; ");
}
