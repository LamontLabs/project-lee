import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { privateAuth } from "./middlewares/private-auth";
import { recoveryModeGuard } from "./middlewares/recovery-mode";
import { pipelineFailureResponse, runRequestPipeline } from "./lib/request-pipeline";
import internalRouter from "./routes/internal";
import internalServicesRouter from "./routes/internal-services";
import { internalServiceAuth } from "./middlewares/private-auth";
import mcpBridgeRouter from "./routes/mcp-bridge";
import projectBridgeRouter from "./routes/project-bridge";
import mcpProjectsRouter from "./routes/mcp-projects";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/mcp", mcpBridgeRouter);
app.use("/api/project-bridge", projectBridgeRouter);
app.use(privateAuth());
app.use(recoveryModeGuard);
app.use("/api/mcp-projects", mcpProjectsRouter);
const internalPipeline = async (req: any, res: any, next: any) => {
  const pipeline = await runRequestPipeline({ text: String(req.body?.message ?? `${req.method} ${req.path}`), origin: "internal", actionType: `${req.method} ${req.path}`, engineName: "Internal API", mode: "normal", budgetTokens: 800 });
  if (!pipeline.ok) {
    res.status(422).json(pipelineFailureResponse(pipeline));
    return;
  }
  (req as any).requestPipeline = pipeline;
  next();
};
app.use("/api/internal", internalPipeline);
app.use("/api/internal-services", internalPipeline);
app.use("/api", router);
const privateInternal = [internalServiceAuth()];
app.use("/api/internal", ...privateInternal);
app.use("/api/internal-services", ...privateInternal);
app.use("/api", internalRouter);
app.use("/api", internalServicesRouter);

export default app;
