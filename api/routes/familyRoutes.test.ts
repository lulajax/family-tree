import express = require('express');
import request = require('supertest');
import familyRoutes from './familyRoutes';
import { familyService } from '../services';
import { errorHandler } from '../middleware/error';
import { requestIdMiddleware } from '../middleware/requestId';
import { TokenPayload } from '../services/AuthService';
import '../middleware/auth';

function createApp(user?: TokenPayload) {
  const app = express();
  app.use(express.json());
  app.use(requestIdMiddleware);
  if (user) {
    app.use((req, _res, next) => {
      req.user = user;
      next();
    });
  }
  app.use('/families', familyRoutes);
  app.use(errorHandler);
  return app;
}

describe('familyRoutes create family ownership', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses the authenticated token subject as family creator', async () => {
    const family = {
      id: '11111111-1111-4111-8111-111111111111',
      name: '登录用户家族',
      description: null,
      root_person_id: null,
      generation_name: null,
      hall_name: null,
      created_at: new Date('2026-05-08T00:00:00Z'),
      updated_at: new Date('2026-05-08T00:00:00Z'),
      created_by: '22222222-2222-4222-8222-222222222222',
    };
    const createFamily = jest.spyOn(familyService, 'createFamily').mockResolvedValue(family);

    await request(createApp({
      sub: '22222222-2222-4222-8222-222222222222',
      username: 'owner-user',
      role: 'member',
      iat: 1,
      exp: 9999999999,
    }))
      .post('/families')
      .send({ name: '登录用户家族' })
      .expect(201);

    expect(createFamily).toHaveBeenCalledWith(
      '登录用户家族',
      undefined,
      undefined,
      '22222222-2222-4222-8222-222222222222',
      undefined,
      undefined,
    );
  });
});
