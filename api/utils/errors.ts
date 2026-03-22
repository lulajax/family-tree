/**
 * Custom application errors.
 */

import { ApiError } from '../types';

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }

  toApiError(): ApiError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      'NOT_FOUND',
      id ? `${resource} (ID: ${id}) 不存在` : `${resource} 不存在`,
      404
    );
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = '未授权访问') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = '禁止访问') {
    super('FORBIDDEN', message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('CONFLICT', message, 409, details);
  }
}

export class CycleDetectedError extends AppError {
  constructor(message = '添加该关系将形成循环') {
    super('CYCLE_DETECTED', message, 409);
  }
}

export class ImportError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('IMPORT_ERROR', message, 400, details);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('DATABASE_ERROR', message, 500, details);
  }
}
