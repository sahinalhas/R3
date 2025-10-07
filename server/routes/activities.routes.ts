/**
 * Activities & Stats Routes
 * Aktivite ve istatistik endpoint'leri
 */

import { Router } from "express";
import { storage } from "../storage";
import { requireAuth } from "../auth";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

// Aktiviteler
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const activities = await storage.getRecentActivities(limit);
    res.json(activities);
  })
);

// Dashboard istatistikleri
router.get(
  "/stats",
  requireAuth,
  asyncHandler(async (req, res) => {
    const stats = await storage.getStats();
    res.json(stats);
  })
);

export default router;
