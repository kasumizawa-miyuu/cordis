import express from "express";
import cors from "cors";
import morgan from "morgan";
import authRoutes from "./routes/auth";
import roomRoutes from "./routes/rooms";
import invitationRoutes from "./routes/invitations";
import messageRoutes from "./routes/messages";
import pluginRoutes from "./routes/plugin";

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