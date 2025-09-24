import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

// Custom HTTP Error class
export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public errors?: any[]
  ) {
    super(message);
    this.name = "HttpError";
  }
}

// Create common HTTP errors
export const notFound = (message: string = "Kaynak bulunamadı") => 
  new HttpError(404, message);

export const badRequest = (message: string = "Eksik ya da hatalı bilgi", errors?: any[]) => 
  new HttpError(400, message, errors);

export const unauthorized = (message: string = "Yetkisiz erişim") => 
  new HttpError(401, message);

export const forbidden = (message: string = "Erişim yasak") => 
  new HttpError(403, message);

export const conflict = (message: string = "Çakışma") => 
  new HttpError(409, message);

// Safe error logging - remove PII
function sanitizeForLogging(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const sanitized = { ...obj };
  const sensitiveFields = ['password', 'token', 'tcKimlikNo', 'phone', 'email'];
  
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

// Global error handler middleware
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  // Log error safely (without PII)
  console.error('API Error:', {
    message: err.message,
    status: err.statusCode || 500,
    path: req.path,
    method: req.method,
    body: sanitizeForLogging(req.body),
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  // Handle different error types
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({
      message: err.message,
      errors: err.errors
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      message: "Eksik ya da hatalı bilgi",
      errors: err.errors
    });
  }

  // Handle database unique constraint errors
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({
      message: "Bu kayıt zaten mevcut"
    });
  }

  // Handle other database errors
  if (err.code && err.code.startsWith('SQLITE_')) {
    return res.status(500).json({
      message: "Veritabanı hatası oluştu"
    });
  }

  // Default error response
  res.status(500).json({
    message: process.env.NODE_ENV === 'development' 
      ? err.message 
      : "Sunucu hatası oluştu"
  });
}

// 404 handler for undefined routes
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    message: `${req.method} ${req.path} bulunamadı`
  });
}