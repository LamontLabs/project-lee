import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, manifestSnapshot } from "@workspace/db";
import { generateManifest, manifestMarkdown, saveManifestSnapshot } from "../lib/system-manifest";

const router: IRouter = Router();
router.get("/manifest", async (_req, res) => res.json(await generateManifest()));
router.get("/manifest.json", async (_req, res) => { const manifest = await generateManifest(); res.setHeader("content-disposition", "attachment; filename=lee-system-manifest.json"); res.json(manifest); });
router.get("/manifest.md", async (_req, res) => { const manifest = await generateManifest(); res.type("text/markdown").setHeader("content-disposition", "attachment; filename=lee-system-manifest.md").send(manifestMarkdown(manifest)); });
router.post("/manifest/snapshot", async (_req, res) => { const manifest = await generateManifest(); res.status(201).json((await saveManifestSnapshot(manifest))[0]); });
router.get("/manifest/history", async (_req, res) => res.json(await db.select().from(manifestSnapshot).orderBy(desc(manifestSnapshot.generatedAt)).limit(52)));

// Compatibility aliases for existing private clients. New clients must use /api/manifest.
router.get("/internal/manifest", async (_req, res) => res.redirect(307, "/api/manifest"));
router.get("/internal/manifest.json", async (_req, res) => res.redirect(307, "/api/manifest.json"));
router.get("/internal/manifest.md", async (_req, res) => res.redirect(307, "/api/manifest.md"));
router.post("/internal/manifest/snapshot", async (_req, res) => res.redirect(307, "/api/manifest/snapshot"));
router.get("/internal/manifest/history", async (_req, res) => res.redirect(307, "/api/manifest/history"));
export default router;