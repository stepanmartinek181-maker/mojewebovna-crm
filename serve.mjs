import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, extname, sep } from "node:path";
const root = fileURLToPath(new URL("./dist/", import.meta.url));
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
};
createServer(async (req, res) => {
  if (!["GET", "HEAD"].includes(req.method)) {
    res.writeHead(405);
    res.end();
    return;
  }
  try {
    const path = decodeURIComponent(
      new URL(req.url, "http://127.0.0.1").pathname,
    );
    const file = resolve(root, "." + (path === "/" ? "/index.html" : path));
    if (!file.startsWith(resolve(root) + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, {
      "Content-Type": mime[extname(file)] || "application/octet-stream",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "DENY",
    });
    res.end(req.method === "HEAD" ? undefined : body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Soubor nenalezen. Nejprve spusť pnpm build.");
  }
})
  .on("error", (error) => {
    console.error(
      error.code === "EADDRINUSE"
        ? "CRM již běží nebo je obsazen port 4173. Otevři http://127.0.0.1:4173"
        : error.message,
    );
    process.exitCode = 1;
  })
  .listen(4173, "127.0.0.1", () =>
    console.log(
      "MojeWebovna CRM: http://127.0.0.1:4173\nServer ukončíš Ctrl+C. Data zůstávají v prohlížeči.",
    ),
  );
