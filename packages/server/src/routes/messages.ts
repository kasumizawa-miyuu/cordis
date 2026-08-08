import { Router } from "express";
import { MessageService } from "../services/message.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get(
  "/rooms/:roomId/messages",
  async (req, res) => {
    try {
      const result = await MessageService.listByRoom(
        req.params.roomId,
        req.userId!,
        req.query as any,
      );
      res.status(200).json(result);
    } catch (err) {
      const error = err as Error & { statusCode?: number };
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  },
);

export default router;