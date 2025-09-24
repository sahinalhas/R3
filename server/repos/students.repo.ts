import { db } from "../db";
import { students, type Student, type InsertStudent } from "@shared/schema";
import { eq, like, or } from "drizzle-orm";

export class StudentsRepository {
  async findById(id: number): Promise<Student | undefined> {
    const result = await db.select().from(students).where(eq(students.id, id));
    return result[0];
  }

  async findByStudentNumber(studentNumber: string): Promise<Student | undefined> {
    const result = await db.select()
      .from(students)
      .where(eq(students.studentNumber, studentNumber));
    return result[0];
  }

  async findAll(query?: string): Promise<Student[]> {
    if (query) {
      return db.select().from(students).where(
        or(
          like(students.firstName, `%${query}%`),
          like(students.lastName, `%${query}%`),
          like(students.studentNumber, `%${query}%`),
          like(students.class, `%${query}%`)
        )
      );
    }
    return db.select().from(students);
  }

  async create(data: InsertStudent): Promise<Student> {
    const result = await db.insert(students).values(data).returning();
    return result[0]!;
  }

  async update(id: number, data: Partial<InsertStudent>): Promise<Student | undefined> {
    const result = await db.update(students)
      .set(data)
      .where(eq(students.id, id))
      .returning();
    return result[0];
  }

  async delete(id: number): Promise<boolean> {
    const result = await db.delete(students)
      .where(eq(students.id, id))
      .returning();
    return result.length > 0;
  }
}

export const studentsRepo = new StudentsRepository();