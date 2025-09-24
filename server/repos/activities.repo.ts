import { db } from "../db";
import { activities, type Activity, type InsertActivity } from "@shared/schema";
import { desc } from "drizzle-orm";

export class ActivitiesRepository {
  async findRecent(limit: number = 10): Promise<Activity[]> {
    return db.select()
      .from(activities)
      .orderBy(desc(activities.createdAt))
      .limit(limit);
  }

  async create(data: InsertActivity): Promise<Activity> {
    const result = await db.insert(activities).values(data).returning();
    return result[0]!;
  }
}

export const activitiesRepo = new ActivitiesRepository();