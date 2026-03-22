/**
 * 参数验证中间件
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { errorResponse, commonErrors } from '../utils/response';

/**
 * 验证请求体
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.parse(req.body);
      req.body = result;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        }));
        errorResponse(
          res,
          commonErrors.validation('请求体验证失败', { errors: details }),
          400
        );
        return;
      }
      next(error);
    }
  };
}

/**
 * 验证查询参数
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.parse(req.query);
      req.query = result as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        }));
        errorResponse(
          res,
          commonErrors.validation('查询参数验证失败', { errors: details }),
          400
        );
        return;
      }
      next(error);
    }
  };
}

/**
 * 验证路由参数
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.parse(req.params);
      req.params = result as Record<string, string>;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        }));
        errorResponse(
          res,
          commonErrors.validation('路由参数验证失败', { errors: details }),
          400
        );
        return;
      }
      next(error);
    }
  };
}

/**
 * 验证文件上传
 */
export function validateFileUpload(
  allowedTypes: string[],
  maxSizeBytes: number
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.file) {
      errorResponse(res, commonErrors.validation('未上传文件'), 400);
      return;
    }

    const file = req.file;

    // 验证文件类型
    if (!allowedTypes.includes(file.mimetype)) {
      errorResponse(
        res,
        commonErrors.validation('不支持的文件类型', {
          allowed: allowedTypes,
          received: file.mimetype,
        }),
        400
      );
      return;
    }

    // 验证文件大小
    if (file.size > maxSizeBytes) {
      errorResponse(
        res,
        commonErrors.validation('文件过大', {
          maxSize: maxSizeBytes,
          received: file.size,
        }),
        400
      );
      return;
    }

    next();
  };
}
