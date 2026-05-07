import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { titleCalculationService } from '../services';
import { validateQuery } from '../middleware';
import { CalculateTitleQuerySchema } from '../types/schemas';
import { successResponse } from '../utils/response';

const router = Router();

router.get('/explain', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      from: z.string().uuid(),
      to: z.string().uuid(),
      as_of: z.string().datetime().optional(),
    });
    const { from, to, as_of } = schema.parse(req.query);
    const result = await titleCalculationService.calculateRelationshipExplanation(from, to, as_of);
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
});

router.get(
  '/',
  validateQuery(CalculateTitleQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query as { from: string; to: string; as_of?: string };
      const result = await titleCalculationService.calculateTitle(
        query.from,
        query.to,
        query.as_of
      );
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }
);

router.post('/batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      from_person_id: z.string().uuid(),
      to_person_ids: z.array(z.string().uuid()),
      as_of: z.string().datetime().optional(),
    });
    const { from_person_id, to_person_ids, as_of } = schema.parse(req.body);
    const results = await titleCalculationService.batchCalculateTitles(
      from_person_id,
      to_person_ids,
      as_of
    );
    successResponse(res, Object.fromEntries(results));
  } catch (error) {
    next(error);
  }
});

router.post('/reverse', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      title: z.string(),
      from_gender: z.enum(['male', 'female']),
    });
    const { title, from_gender } = schema.parse(req.body);
    successResponse(res, {
      title: titleCalculationService.getReverseTitle(title, from_gender),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
