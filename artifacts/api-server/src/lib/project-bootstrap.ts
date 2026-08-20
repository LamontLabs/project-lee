import { promises as fs } from "node:fs";
import path from "node:path";
import { desc, eq } from "drizzle-orm";
import { bootstrapRun, db } from "@workspace/db";
import { emitEvent } from "./foundation-events";

type FileEntry = { path: string; size: number; lines: number; content?: string };
const ignored = new Set(["node_modules", ".git", "dist", "build", ".next", ".expo", "coverage"]);
async function walk(root: string, current = root, output: FileEntry[] = []): Promise<FileEntry[]> {
  for (const item of await fs.readdir(current, { withFileTypes: true })) {
    if (ignored.has(item.name) || item.name.startsWith(".")) continue;
    const full = path.join(current, item.name); const relative = path.relative(root, full);
    if (item.isDirectory()) await walk(root, full, output);
    else { const buffer = await fs.readFile(full); const text = buffer.toString("utf8"); output.push({ path: relative, size: buffer.length, lines: text.split("\n").length, content: buffer.length < 200_000 ? text : undefined }); }
  }
  return output;
}
function stack(files: FileEntry[]) {
  const pkg = files.find((file) => file.path === "package.json"); let parsed: any = {};
  try { parsed = pkg?.content ? JSON.parse(pkg.content) : {}; } catch { parsed = {}; }
  const dependencies = Object.entries({ ...(parsed.dependencies ?? {}), ...(parsed.devDependencies ?? {}) }).map(([name, version]) => ({ name, version, category: /react|vite|expo|next/.test(name) ? "framework" : /drizzle|pg|prisma|sql/.test(name) ? "database" : /test|vitest|jest|playwright/.test(name) ? "testing" : "library" }));
  return { languages: files.map((file) => path.extname(file.path)).filter(Boolean).reduce<Record<string, number>>((acc, ext) => { acc[ext] = (acc[ext] ?? 0) + 1; return acc; }, {}), frameworks: dependencies.filter((item) => item.category === "framework").map((item) => item.name), runtime: parsed.engines?.node ?? null, packageManager: files.some((file) => file.path === "pnpm-lock.yaml") ? "pnpm" : files.some((file) => file.path === "package-lock.json") ? "npm" : null, dependenciesCount: Object.keys(parsed.dependencies ?? {}).length, devDependenciesCount: Object.keys(parsed.devDependencies ?? {}).length, dependencies };
}
function analyze(root: string, files: FileEntry[]) {
  const readme = files.find((file) => /^README(\.md)?$/i.test(path.basename(file.path)));
  const docs = files.filter((file) => /(^|\/)(docs?|documentation)\//i.test(file.path) || /^(README|CONTRIBUTING|CHANGELOG|LICENSE)/i.test(path.basename(file.path))).map((file) => file.path);
  const configs = files.filter((file) => /(^|\/)(\.env\.example|Dockerfile|docker-compose|replit|drizzle|openapi|swagger|prisma|\.github\/workflows)/i.test(file.path)).map((file) => file.path);
  const apiFiles = files.filter((file) => /routes|openapi|swagger|api\//i.test(file.path)).map((file) => file.path);
  const topDirectories = [...new Set(files.map((file) => file.path.split(path.sep)[0]))];
  const securityIssues = files.filter((file) => !/\.env|secret|credential/i.test(file.path) && file.content && /(api[_-]?key|password|private[_-]?key)\s*[:=]\s*["'][^"']{8,}/i.test(file.content)).map((file) => `Credential-like string in ${file.path}`);
  const issues = [...(docs.some((file) => /CHANGELOG/i.test(file)) ? [] : ["No CHANGELOG found"]), ...(readme?.content?.match(/architecture/i) ? [] : ["README is missing an Architecture section"]), ...securityIssues];
  return { technologyStack: stack(files), repositoryMap: { totalFiles: files.length, totalLines: files.reduce((sum, file) => sum + file.lines, 0), topDirectories, filesByExtension: stack(files).languages }, projectSummary: { content: readme?.content?.slice(0, 2000) ?? "No README found.", sourceRefs: readme ? [readme.path] : [], confidence: readme ? 0.7 : 0.3 }, architecture: { layers: topDirectories.filter((name) => /src|app|server|client|lib|db|worker|api|test/i.test(name)), configurationFiles: configs, apiFiles }, documentation: { files: docs, missing: issues.filter((issue) => /README|CHANGELOG/.test(issue)) }, configuration: configs, securityObservations: securityIssues, issues, questions: readme ? ["Is this repository primarily for external customers or internal use?"] : ["What is the intended purpose of this repository?"] };
}
export async function runBootstrap(projectId: string, repositoryId: string) {
  const [run] = await db.insert(bootstrapRun).values({ projectId, repositoryId }).returning();
  try {
    const root = process.env.LEE_BOOTSTRAP_ROOT ?? process.cwd(); const files = await walk(root); const report = analyze(root, files);
    const [completed] = await db.update(bootstrapRun).set({ status: "completed", completedAt: new Date(), factsCreatedCount: 5, interpretationsCreatedCount: 1, graphNodesCreatedCount: report.architecture.layers.length, questionsGenerated: report.questions.length, issuesFlagged: report.issues.length, report }).where(eq(bootstrapRun.id, run.id)).returning();
    await emitEvent({ eventType: "BootstrapCompleted", aggregateType: "bootstrap_run", aggregateId: run.id, payload: { projectId, repositoryId, factsCreatedCount: completed.factsCreatedCount, issuesFlagged: completed.issuesFlagged } });
    return completed;
  } catch (error) { const [failed] = await db.update(bootstrapRun).set({ status: "failed", completedAt: new Date(), error: String(error) }).where(eq(bootstrapRun.id, run.id)).returning(); return failed; }
}
export async function bootstrapStatus(id: string) { const [run] = await db.select().from(bootstrapRun).where(eq(bootstrapRun.id, id)); return run ?? null; }
export async function bootstrapHistory(projectId?: string) { return db.select().from(bootstrapRun).where(projectId ? eq(bootstrapRun.projectId, projectId) : undefined as any).orderBy(desc(bootstrapRun.startedAt)).limit(50); }