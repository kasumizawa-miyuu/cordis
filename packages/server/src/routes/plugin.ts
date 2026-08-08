import { Router } from "express";
import { PluginService } from "../services/plugin";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { startPluginSchema, endPluginSchema } from "@cordis/shared";

const router = Router();

router.get("/plugin/list", (_req, res) => {
  res.status(200).json(PluginService.listPlugins());
});

router.post(
  "/plugin/start",
  requireAuth,
  validate(startPluginSchema),
  async (req, res) => {
    try {
      const result = await PluginService.start(
        req.body.roomId,
        req.body.pluginId,
        req.userId!,
      );
      res.status(200).json(result);
    } catch (err) {
      const error = err as Error & { statusCode?: number };
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  },
);

router.post(
  "/plugin/end",
  validate(endPluginSchema),
  async (req, res) => {
    try {
      await PluginService.end(
        req.body.pluginId,
        req.body.token,
      );
      res.status(200).json({ message: "Plugin ended" });
    } catch (err) {
      const error = err as Error & { statusCode?: number };
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  },
);

router.get("/plugin/:pluginId/context", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : "";
    const result = await PluginService.getContext(
      req.params.pluginId,
      token,
    );
    res.status(200).json(result);
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

export default router;