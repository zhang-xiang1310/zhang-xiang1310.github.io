import http from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createReadStream } from "node:fs";
import { promises as fs } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = Number(process.env.PORT || 3000);

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".gif", "image/gif"],
  [".svg", "image/svg+xml"]
]);

const handlerCache = new Map();

async function loadHandler(routePath) {
  if (!handlerCache.has(routePath)) {
    const filePath = path.join(__dirname, routePath);
    handlerCache.set(routePath, import(pathToFileURL(filePath).href));
  }

  const module = await handlerCache.get(routePath);
  return module.default;
}

async function serveStatic(req, res, pathname) {
  let filePath;

  if (pathname === "/") {
    filePath = path.join(__dirname, "index.html");
  } else if (pathname.startsWith("/assets/")) {
    filePath = path.join(__dirname, "public", pathname.slice(1));
  } else if (pathname.startsWith("/uploads/")) {
    filePath = path.join(__dirname, "public", pathname.slice(1));
  } else {
    filePath = path.join(__dirname, pathname.slice(1));
  }

  try {
    const stat = await fs.stat(filePath);

    if (!stat.isFile()) {
      throw new Error("Not a file");
    }

    const ext = path.extname(filePath).toLowerCase();
    res.statusCode = 200;
    res.setHeader("Content-Type", mimeTypes.get(ext) || "application/octet-stream");
    createReadStream(filePath).pipe(res);
  } catch {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Not found");
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (url.pathname.startsWith("/api/")) {
    const routePath = `.${url.pathname}.js`;
    try {
      const handler = await loadHandler(routePath);
      if (!handler) {
        throw new Error("Missing handler");
      }
      await handler(req, res);
    } catch (error) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ ok: false, message: error.message }));
    }
    return;
  }

  await serveStatic(req, res, url.pathname);
});

server.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});
