import { Router } from "express";
import { studentsService } from "../services/students.service";
import { asyncHandler } from "../middleware/asyncHandler";
import { validate, idParamSchema, searchQuerySchema } from "../middleware/validate";
import { insertStudentSchema } from "@shared/schema";
import { requireAuth } from "../auth";

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
    const { id } = req.params as { id: number };
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
    const { id } = req.params as { id: number };
    const student = await studentsService.updateStudent(id, req.body);
    res.json(student);
  })
);

// Delete student
router.delete("/:id", 
  requireAuth,
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const { id } = req.params as { id: number };
    await studentsService.deleteStudent(id);
    res.status(204).end();
  })
);

export { router as studentsRouter };