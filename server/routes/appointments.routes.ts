/**
 * Appointments Routes
 * Randevu yönetimi endpoint'leri
 */

import { Router } from "express";
import { appointmentsService } from "../services/appointments.service";
import { requireAuth } from "../auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../middleware/asyncHandler";
import { insertAppointmentSchema } from "@shared/schema";
import { HTTP_STATUS } from "../config/constants";

const router = Router();

// Tüm randevuları getir
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const appointments = await appointmentsService.getAppointments(status);
    res.json(appointments);
  })
);

// Öğrenciye göre randevuları getir
router.get(
  "/student/:studentId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const studentId = parseInt(req.params.studentId);
    const appointments = await appointmentsService.getAppointmentsByStudent(studentId);
    res.json(appointments);
  })
);

// Tekil randevu getir
router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const appointment = await appointmentsService.getAppointment(id);
    res.json(appointment);
  })
);

// Yeni randevu oluştur
router.post(
  "/",
  requireAuth,
  validate({ body: insertAppointmentSchema }),
  asyncHandler(async (req, res) => {
    const counselorName = req.user?.fullName;
    const appointment = await appointmentsService.createAppointment(req.body, counselorName);
    res.status(HTTP_STATUS.CREATED).json(appointment);
  })
);

// Randevu güncelle
router.put(
  "/:id",
  requireAuth,
  validate({ body: insertAppointmentSchema.partial() }),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const updaterName = req.user?.fullName;
    const appointment = await appointmentsService.updateAppointment(id, req.body, updaterName);
    res.json(appointment);
  })
);

// Randevu sil
router.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const deleterName = req.user?.fullName;
    await appointmentsService.deleteAppointment(id, deleterName);
    res.sendStatus(HTTP_STATUS.OK);
  })
);

export default router;
