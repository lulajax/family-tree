import { Request, Response, NextFunction } from 'express';
import { verifyJwt, TokenPayload } from '../services/AuthService';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { UserRole } from '../types';

// Extend Express Request to include auth info
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || '';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function shouldSkipAuthInDevelopment(): boolean {
  return !JWT_SECRET && !IS_PRODUCTION;
}

/**
 * JWT authentication middleware.
 * If JWT_SECRET is not configured, authentication is skipped only outside production.
 */
export function authenticateToken(req: Request, _res: Response, next: NextFunction): void {
  // Skip auth if JWT_SECRET is not configured (dev mode)
  if (shouldSkipAuthInDevelopment()) {
    return next();
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return next(new UnauthorizedError('请提供认证令牌'));
  }

  const payload = verifyJwt(token);
  if (!payload) {
    return next(new UnauthorizedError('认证令牌无效或已过期'));
  }

  req.user = payload;
  next();
}

/**
 * Optional authentication — attaches user info if token is present,
 * but does not reject unauthenticated requests.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  if (shouldSkipAuthInDevelopment()) {
    return next();
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token) {
    const payload = verifyJwt(token);
    if (payload) {
      req.user = payload;
    }
  }

  next();
}

/**
 * Role-based authorization middleware.
 * Must be used after authenticateToken.
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // Skip role check if JWT_SECRET is not configured
    if (shouldSkipAuthInDevelopment()) {
      return next();
    }

    if (!req.user) {
      return next(new UnauthorizedError('请先登录'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError(`需要以下角色之一: ${roles.join(', ')}`));
    }

    next();
  };
}
