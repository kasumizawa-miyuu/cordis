import { Router } from "express";
import { InvitationService } from "../services/invitation.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
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
        req.params.roomId as string,
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
      req.params.roomId as string,
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