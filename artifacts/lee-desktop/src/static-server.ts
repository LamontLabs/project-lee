import { createServer, request as httpRequest, type Server } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const MIME: Record<string, string> = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".woff2": "font/woff2" };

export function startConsoleServer(root: string, apiUrl: string): Promise<{ server: Server; url: string }> {
  const server = createServer((request, response) => {
    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
    if (pathname.startsWith("/api/")) {
      const upstream = httpRequest(`${apiUrl}${pathname}${new URL(request.url ?? "/", "http://localhost").search}`, { method: request.method, headers: request.headers }, (upstreamResponse) => {
        response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
        upstreamResponse.pipe(response);
      });
      upstream.on("error", () => response.writeHead(502).end("LEE Core unavailable"));
      request.pipe(upstream);
      return;
    }
    const safePath = normalize(join(root, pathname === "/" ? "index.html" : pathname));
    const filePath = safePath.startsWith(root) && existsSync(safePath) && statSync(safePath).isFile() ? safePath : join(root, "index.html");
    response.setHeader("content-type", MIME[extname(filePath)] ?? "application/octet-stream");
    createReadStream(filePath).on("error", () => response.writeHead(404).end()).pipe(response);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    resolve({ server, url: `http://127.0.0.1:${port}` });
  }));
}