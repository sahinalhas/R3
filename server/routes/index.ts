import { Express, Router } from "express";
import { createServer, type Server } from "http";
import { studentsRouter } from "./students.routes";
import { errorHandler, notFoundHandler } from "../middleware/errors";
import { setupAuth } from "../auth";
import { registerLegacyRoutes } from "./legacy.routes";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup auth first
  setupAuth(app);

  // Register legacy routes first (temporarily until all domains are extracted)
  await registerLegacyRoutes(app);

  const router = Router();

  // Mount new modular domain routers
  router.use("/students", studentsRouter);

  // Mount all new API routes under /api
  app.use("/api", router);

  // 404 handler for API routes (should be after all route registrations)
  app.use("/api/*", notFoundHandler);

  // Global error handler (must be last)
  app.use(errorHandler);

  // Create and return HTTP server
  return createServer(app);
}