/**
 * Appointments Service
 * Randevu yönetimi iş mantığı
 */

import { storage } from "../storage";
import { activitiesRepo } from "../repos/activities.repo";
import { type Appointment, type InsertAppointment } from "@shared/schema";
import { notFound } from "../middleware/errors";

export class AppointmentsService {
  async getAppointment(id: number): Promise<Appointment> {
    const appointment = await storage.getAppointment(id);
    if (!appointment) {
      throw notFound("Randevu bulunamadı");
    }
    return appointment;
  }

  async getAppointments(status?: string): Promise<Appointment[]> {
    return storage.getAppointments(status);
  }

  async getAppointmentsByStudent(studentId: number): Promise<Appointment[]> {
    return storage.getAppointmentsByStudent(studentId);
  }

  async createAppointment(data: InsertAppointment, counselorName?: string): Promise<Appointment> {
    const appointment = await storage.createAppointment(data);

    // Öğrenci bilgisini al
    const student = await storage.getStudent(data.studentId);
    const studentName = student ? `${student.firstName} ${student.lastName}` : "Öğrenci";

    // Aktivite kaydı ekle
    await activitiesRepo.create({
      type: "randevu_oluşturma",
      message: `${studentName} için yeni randevu oluşturuldu.${counselorName ? ` Danışman: ${counselorName}` : ''}`,
      relatedId: appointment.id
    });

    return appointment;
  }

  async updateAppointment(
    id: number, 
    data: Partial<InsertAppointment>,
    updaterName?: string
  ): Promise<Appointment> {
    const existingAppointment = await storage.getAppointment(id);
    if (!existingAppointment) {
      throw notFound("Randevu bulunamadı");
    }

    const updatedAppointment = await storage.updateAppointment(id, data);
    if (!updatedAppointment) {
      throw new Error("Randevu güncellenemedi");
    }

    // Öğrenci bilgisini al
    const student = await storage.getStudent(updatedAppointment.studentId);
    const studentName = student ? `${student.firstName} ${student.lastName}` : "Öğrenci";

    // Aktivite kaydı ekle
    await activitiesRepo.create({
      type: "randevu_güncelleme",
      message: `${studentName} randevusu güncellendi.${updaterName ? ` Güncelleyen: ${updaterName}` : ''}`,
      relatedId: id
    });

    return updatedAppointment;
  }

  async deleteAppointment(id: number, deleterName?: string): Promise<void> {
    const appointment = await storage.getAppointment(id);
    if (!appointment) {
      throw notFound("Randevu bulunamadı");
    }

    // Öğrenci bilgisini al
    const student = await storage.getStudent(appointment.studentId);
    const studentName = student ? `${student.firstName} ${student.lastName}` : "Öğrenci";

    const deleted = await storage.deleteAppointment(id);
    if (!deleted) {
      throw new Error("Randevu silinemedi");
    }

    // Aktivite kaydı ekle
    await activitiesRepo.create({
      type: "randevu_silme",
      message: `${studentName} randevusu iptal edildi.${deleterName ? ` İptal eden: ${deleterName}` : ''}`,
      relatedId: id
    });
  }
}

export const appointmentsService = new AppointmentsService();
