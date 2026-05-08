import express = require('express');
import request = require('supertest');
import personRoutes from './personRoutes';
import { titleCalculationService } from '../services';
import { errorHandler } from '../middleware/error';
import { requestIdMiddleware } from '../middleware/requestId';
import { logger } from '../utils/logger';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(requestIdMiddleware);
  app.use('/persons', personRoutes);
  app.use(errorHandler);
  return app;
}

describe('personRoutes relationship-to endpoint', () => {
  beforeEach(() => {
    jest.spyOn(logger, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns a relationship explanation for a target person relative to a reference person', async () => {
    const calculate = jest.spyOn(titleCalculationService, 'calculateRelationshipExplanation').mockResolvedValue({
      reference_person_id: '11111111-1111-4111-8111-111111111111',
      target_person_id: '22222222-2222-4222-8222-222222222222',
      title: '表姐',
      reverse_title: '表弟',
      side: 'maternal',
      distance: 3,
      relationship_path: ['parent', 'sibling', 'child'],
      human_readable_path: ['父母', '兄弟姐妹', '子女'],
      summary: '你应该称呼 TA 为「表姐」。关系路径：你 → 父母 → 兄弟姐妹 → 子女 → TA。',
      confidence: 'exact',
      common_ancestor: null,
    });

    const response = await request(createApp())
      .get('/persons/22222222-2222-4222-8222-222222222222/relationship-to')
      .query({ reference: '11111111-1111-4111-8111-111111111111' })
      .expect(200);

    expect(calculate).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
      undefined
    );
    expect(response.body).toMatchObject({
      success: true,
      data: {
        title: '表姐',
        reverse_title: '表弟',
        side: 'maternal',
        distance: 3,
        relationship_path: ['parent', 'sibling', 'child'],
      },
    });
  });

  it('requires a valid reference query parameter', async () => {
    await request(createApp())
      .get('/persons/22222222-2222-4222-8222-222222222222/relationship-to')
      .expect(400);
  });
});
