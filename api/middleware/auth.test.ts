import { Request, Response } from 'express';

function loadAuthMiddleware(env: { NODE_ENV?: string; JWT_SECRET?: string }) {
  jest.resetModules();
  const previousNodeEnv = process.env.NODE_ENV;
  const previousJwtSecret = process.env.JWT_SECRET;

  if (env.NODE_ENV === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = env.NODE_ENV;

  if (env.JWT_SECRET === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = env.JWT_SECRET;

  const mod = require('./auth') as typeof import('./auth');

  process.env.NODE_ENV = previousNodeEnv;
  if (previousJwtSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = previousJwtSecret;

  return mod;
}

describe('auth middleware production safety', () => {
  it('does not skip authentication in production when JWT_SECRET is missing', () => {
    const { authenticateToken } = loadAuthMiddleware({ NODE_ENV: 'production' });
    const next = jest.fn();

    authenticateToken({ headers: {} } as Request, {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('still allows explicit development mode without JWT_SECRET for local smoke tests', () => {
    const { authenticateToken } = loadAuthMiddleware({ NODE_ENV: 'development' });
    const next = jest.fn();

    authenticateToken({ headers: {} } as Request, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
  });
});
