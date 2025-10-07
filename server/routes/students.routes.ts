import { Router } from "express";
import { studentsService } from "../services/students.service";
import { asyncHandler } from "../middleware/asyncHandler";
import { validate, idParamSchema, searchQuerySchema } from "../middleware/validate";
import { insertStudentSchema } from "@shared/schema";
import { requireAuth } from "../auth";
import { storage } from "../storage";
import { z } from "zod";

const router = Router();

// Get all students with optional search
router.get("/", 
  requireAuth,
  validate({ query: searchQuerySchema }),
  asyncHandler(async (req, res) => {
    const { q } = req.query;
    const students = await studentsService.getStudents(q as string);
    res.json(students);
  })
);

// Get single student
router.get("/:id", 
  requireAuth,
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const student = await studentsService.getStudent(id);
    res.json(student);
  })
);

// Create new student
router.post("/", 
  requireAuth,
  validate({ body: insertStudentSchema }),
  asyncHandler(async (req, res) => {
    const student = await studentsService.createStudent(req.body);
    res.status(201).json(student);
  })
);

// Update student
router.put("/:id", 
  requireAuth,
  validate({ 
    params: idParamSchema,
    body: insertStudentSchema.partial()
  }),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const student = await studentsService.updateStudent(id, req.body);
    res.json(student);
  })
);

// Delete student
router.delete("/:id", 
  requireAuth,
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    await studentsService.deleteStudent(id);
    res.status(204).end();
  })
);

// Günlük konu programını getir (Takvim 2)
router.get("/:id/daily-topic-schedule", 
  requireAuth,
  asyncHandler(async (req, res) => {
    const studentId = parseInt(req.params.id);
    
    const schema = z.object({
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Geçerli tarih formatı: YYYY-MM-DD"),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Geçerli tarih formatı: YYYY-MM-DD")
    });
    
    const { startDate, endDate } = schema.parse(req.query);
    
    // Tarih doğrulama
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      return res.status(400).json({ 
        message: "Başlangıç tarihi bitiş tarihinden sonra olamaz" 
      });
    }
    
    const schedules = await storage.getDailyTopicScheduleByDateRange(studentId, startDate, endDate);
    res.json(schedules);
  })
);

export { router as studentsRouter };