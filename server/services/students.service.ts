import { studentsRepo } from "../repos/students.repo";
import { activitiesRepo } from "../repos/activities.repo";
import { type Student, type InsertStudent } from "@shared/schema";
import { notFound, conflict } from "../middleware/errors";

export class StudentsService {
  async getStudent(id: number): Promise<Student> {
    const student = await studentsRepo.findById(id);
    if (!student) {
      throw notFound("Öğrenci bulunamadı");
    }
    return student;
  }

  async getStudents(query?: string): Promise<Student[]> {
    return studentsRepo.findAll(query);
  }

  async createStudent(data: InsertStudent): Promise<Student> {
    // Check if student number already exists
    const existingStudent = await studentsRepo.findByStudentNumber(data.studentNumber);
    if (existingStudent) {
      throw conflict("Bu öğrenci numarası zaten kullanılıyor");
    }

    // Create student
    const student = await studentsRepo.create(data);

    // Log activity
    await activitiesRepo.create({
      type: "öğrenci_ekleme",
      message: `Yeni öğrenci ${student.firstName} ${student.lastName} kaydedildi.`,
      relatedId: student.id
    });

    return student;
  }

  async updateStudent(id: number, data: Partial<InsertStudent>): Promise<Student> {
    // Check if student exists
    const existingStudent = await studentsRepo.findById(id);
    if (!existingStudent) {
      throw notFound("Öğrenci bulunamadı");
    }

    // Check student number uniqueness if it's being changed
    if (data.studentNumber && data.studentNumber !== existingStudent.studentNumber) {
      const duplicateStudent = await studentsRepo.findByStudentNumber(data.studentNumber);
      if (duplicateStudent) {
        throw conflict("Bu öğrenci numarası zaten kullanılıyor");
      }
    }

    // Update student
    const updatedStudent = await studentsRepo.update(id, data);
    if (!updatedStudent) {
      throw new Error("Öğrenci güncellenemedi");
    }

    // Log activity
    await activitiesRepo.create({
      type: "öğrenci_güncelleme",
      message: `Öğrenci ${updatedStudent.firstName} ${updatedStudent.lastName} bilgileri güncellendi.`,
      relatedId: id
    });

    return updatedStudent;
  }

  async deleteStudent(id: number): Promise<void> {
    const student = await studentsRepo.findById(id);
    if (!student) {
      throw notFound("Öğrenci bulunamadı");
    }

    const deleted = await studentsRepo.delete(id);
    if (!deleted) {
      throw new Error("Öğrenci silinemedi");
    }

    // Log activity
    await activitiesRepo.create({
      type: "öğrenci_silme",
      message: `Öğrenci ${student.firstName} ${student.lastName} silindi.`,
      relatedId: id
    });
  }
}

export const studentsService = new StudentsService();