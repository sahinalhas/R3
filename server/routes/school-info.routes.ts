/**
 * School Info Routes
 * Okul bilgileri endpoint'leri
 */

import { Router } from "express";
import { storage } from "../storage";
import { requireAuth } from "../auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../middleware/asyncHandler";
import { insertSchoolInfoSchema } from "@shared/schema";
import { HTTP_STATUS } from "../config/constants";

const router = Router();

// Okul bilgilerini getir
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const schoolInfo = await storage.getSchoolInfo();
    res.json(schoolInfo);
  })
);

// Okul bilgilerini oluştur/güncelle
router.post(
  "/",
  requireAuth,
  validate({ body: insertSchoolInfoSchema }),
  asyncHandler(async (req, res) => {
    const schoolInfo = await storage.updateSchoolInfo(req.body);
    res.status(HTTP_STATUS.CREATED).json(schoolInfo);
  })
);

export default router;
