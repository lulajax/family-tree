/**
 * Global error middleware.
 */

import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { commonErrors, errorResponse } from '../utils/response';
import { logger } from '../utils/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error(
    {
      error: err.message,
      stack: err.stack,
      method: req.method,
      path: req.path,
      request_id: res.locals.requestId as string | undefined,
    },
    'Unhandled request error'
  );

  if (err instanceof ZodError) {
    errorResponse(
      res,
      commonErrors.validation('请求参数验证失败', {
        errors: err.errors.map((item) => ({
          path: item.path.join('.'),
          message: item.message,
        })),
      }),
      400
    );
    return;
  }

  if (err instanceof AppError) {
    errorResponse(res, err.toApiError(), err.statusCode);
    return;
  }

  errorResponse(res, commonErrors.internal(), 500);
}

export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  errorResponse(
    res,
    {
      code: 'NOT_FOUND',
      message: `路由 ${req.method} ${req.path} 不存在`,
    },
    404
  );
}
