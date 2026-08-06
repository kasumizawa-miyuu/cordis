import { Router } from "express";
import { InvitationService } from "../services/invitation";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  joinByInviteSchema,
} from "@cordis/shared";

const router = Router();

router.use(requireAuth);

router.post(
  "/rooms/:roomId/invitations",
  async (req, res) => {
    try {
      const invitation = await InvitationService.create(
        req.params.roomId,
        req.userId!,
        req.body,
      );
      res.status(201).json(invitation);
    } catch (err) {
      const error = err as Error & { statusCode?: number };
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  },
);

router.get("/rooms/:roomId/invitations", async (req, res) => {
  try {
    const invitations = await InvitationService.listByRoom(
      req.params.roomId,
      req.userId!,
    );
    res.status(200).json(invitations);
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

router.post(
  "/invitations/join",
  validate(joinByInviteSchema),
  async (req, res) => {
    try {
      const member = await InvitationService.joinByCode(
        req.body.code,
        req.userId!,
      );
      res.status(201).json(member);
    } catch (err) {
      const error = err as Error & { statusCode?: number };
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  },
);

export default router;