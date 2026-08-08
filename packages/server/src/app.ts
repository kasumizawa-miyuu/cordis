import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.js";
import roomRoutes from "./routes/rooms.js";
import invitationRoutes from "./routes/invitations.js";
import messageRoutes from "./routes/messages.js";
import pluginRoutes from "./routes/plugin.js";
import { config } from "./config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp(): express.Application {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(morgan("dev"));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/rooms", roomRoutes);
  app.use("/api", invitationRoutes);
  app.use("/api", messageRoutes);
  app.use("/api", pluginRoutes);

  if (config.nodeEnv === "production") {
    app.use(express.static(path.join(__dirname, "../../client/dist")));
    app.get("*", (req, res) => {
      if (!req.path.startsWith("/api") && !req.path.startsWith("/socket.io")) {
        res.sendFile(path.join(__dirname, "../../client/dist/index.html"));
      }
    });
  }

  app.use((_req, res) => {
    res.status(404).json({ message: "Not found" });
  });

  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    },
  );

  return app;
}