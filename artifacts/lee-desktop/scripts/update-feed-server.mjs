import { createReadStream, existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { join, normalize, resolve } from "node:path";

const root = resolve(process.argv[process.argv.indexOf("--root") + 1]);
const readyFile = process.argv.includes("--ready-file") ? resolve(process.argv[process.argv.indexOf("--ready-file") + 1]) : null;
const port = Number(process.argv[process.argv.indexOf("--port") + 1] ?? 0);

const server = createServer((request, response) => {
  const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
  const filePath = normalize(join(root, pathname === "/" ? "latest.yml" : pathname));
  if (!filePath.startsWith(root) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404).end();
    return;
  }
  response.setHeader("content-length", statSync(filePath).size);
  createReadStream(filePath).pipe(response);
});

server.listen(port, "127.0.0.1", () => {
  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : 0;
  if (readyFile) writeFileSync(readyFile, JSON.stringify({ url: `http://127.0.0.1:${actualPort}/` }), "utf8");
  console.log(`Update feed server listening on ${actualPort}`);
});

process.on("SIGTERM", () => server.close(() => process.exit(0)));