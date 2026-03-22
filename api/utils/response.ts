/**
 * API response helpers
 */

import { randomUUID } from 'crypto';
import { Response } from 'express';
import { ApiError, ApiResponse, ResponseMeta } from '../types';

export function generateRequestId(): string {
  return randomUUID();
}

export function successResponse<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: Partial<ResponseMeta>
): void {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      request_id: (res.locals.requestId as string) || generateRequestId(),
      ...meta,
    },
  };

  res.status(statusCode).json(response);
}

export function errorResponse(
  res: Response,
  error: ApiError,
  statusCode = 400
): void {
  const response: ApiResponse = {
    success: false,
    error,
    meta: {
      timestamp: new Date().toISOString(),
      request_id: (res.locals.requestId as string) || generateRequestId(),
    },
  };

  res.status(statusCode).json(response);
}

export const commonErrors = {
  validation(message: string, details?: Record<string, unknown>): ApiError {
    return { code: 'VALIDATION_ERROR', message, details };
  },
  notFound(resource: string, id?: string): ApiError {
    return {
      code: 'NOT_FOUND',
      message: id ? `${resource} (ID: ${id}) 不存在` : `${resource} 不存在`,
    };
  },
  unauthorized(message = '未授权访问'): ApiError {
    return { code: 'UNAUTHORIZED', message };
  },
  forbidden(message = '禁止访问'): ApiError {
    return { code: 'FORBIDDEN', message };
  },
  conflict(message: string, details?: Record<string, unknown>): ApiError {
    return { code: 'CONFLICT', message, details };
  },
  internal(message = '服务器内部错误'): ApiError {
    return { code: 'INTERNAL_ERROR', message };
  },
  badRequest(message: string, details?: Record<string, unknown>): ApiError {
    return { code: 'BAD_REQUEST', message, details };
  },
  cycleDetected(message = '添加该关系将形成循环'): ApiError {
    return { code: 'CYCLE_DETECTED', message };
  },
  importError(message: string, details?: Record<string, unknown>): ApiError {
    return { code: 'IMPORT_ERROR', message, details };
  },
};

export function sendValidationError(
  res: Response,
  message: string,
  details?: Record<string, unknown>
): void {
  errorResponse(res, commonErrors.validation(message, details), 400);
}

export function sendNotFoundError(
  res: Response,
  resource: string,
  id?: string
): void {
  errorResponse(res, commonErrors.notFound(resource, id), 404);
}

export function sendCycleError(res: Response, message?: string): void {
  errorResponse(res, commonErrors.cycleDetected(message), 409);
}
