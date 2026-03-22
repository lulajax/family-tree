import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { searchService } from '../services';
import { successResponse } from '../utils/response';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const querySchema = z.object({
      q: z.string().min(1).max(200),
      family_id: z.string().uuid().optional(),
      fields: z.string().default('name,bio'),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      offset: z.coerce.number().int().min(0).default(0),
    });
    const { q, family_id, fields, limit, offset } = querySchema.parse(req.query);
    const result = await searchService.search({
      q,
      family_id,
      fields: fields.split(',').map((field) => field.trim()),
      limit,
      offset,
    });
    successResponse(res, result.results, 200, {
      total: result.total,
      limit,
      offset,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/suggestions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const querySchema = z.object({
      q: z.string().min(1).max(100),
      family_id: z.string().uuid().optional(),
      limit: z.coerce.number().int().min(1).max(20).default(10),
    });
    const { q, family_id, limit } = querySchema.parse(req.query);
    successResponse(res, await searchService.getSuggestions(q, family_id, limit));
  } catch (error) {
    next(error);
  }
});

router.post('/advanced', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bodySchema = z.object({
      name: z.string().optional(),
      gender: z.enum(['male', 'female', 'unknown']).optional(),
      birthYearFrom: z.number().int().optional(),
      birthYearTo: z.number().int().optional(),
      familyId: z.string().uuid().optional(),
      hasChildren: z.boolean().optional(),
      limit: z.number().int().min(1).max(100).default(20),
      offset: z.number().int().min(0).default(0),
    });
    const params = bodySchema.parse(req.body);
    const result = await searchService.advancedSearch(params);
    successResponse(res, result.results, 200, {
      total: result.total,
      limit: params.limit,
      offset: params.offset,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/reindex', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await searchService.rebuildIndex();
    successResponse(res, { message: '搜索索引重建成功' });
  } catch (error) {
    next(error);
  }
});

export default router;
