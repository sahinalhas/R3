import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";

interface ValidationConfig {
  body?: z.ZodSchema<any>;
  params?: z.ZodSchema<any>;
  query?: z.ZodSchema<any>;
}

export function validate(config: ValidationConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      if (config.body) {
        req.body = config.body.parse(req.body);
      }

      // Validate request params
      if (config.params) {
        req.params = config.params.parse(req.params);
      }

      // Validate request query
      if (config.query) {
        req.query = config.query.parse(req.query);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Eksik ya da hatalı bilgi",
          errors: error.errors
        });
      }
      next(error);
    }
  };
}

// Common param schemas
export const idParamSchema = z.object({
  id: z.string().transform((val) => {
    const parsed = parseInt(val);
    if (isNaN(parsed)) {
      throw new Error("ID sayısal olmalı");
    }
    return parsed;
  })
});

// Common query schemas
export const searchQuerySchema = z.object({
  q: z.string().optional()
});