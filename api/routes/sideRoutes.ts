import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { sideCalculationService } from '../services';
import { UuidSchema } from '../types/schemas';
import { successResponse } from '../utils/response';

const router = Router();

router.get('/determine', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reference, target } = z
      .object({ reference: UuidSchema, target: UuidSchema })
      .parse(req.query);
    const side = await sideCalculationService.determineSide(reference, target);
    successResponse(res, {
      side,
      description:
        side === 'paternal'
          ? '父系亲属'
          : side === 'maternal'
            ? '母系亲属'
            : side === 'affinity'
              ? '姻亲关系'
              : side === 'self'
                ? '本人'
                : '未知关系',
    });
  } catch (error) {
    next(error);
  }
});

router.get('/path', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { from, to } = z.object({ from: UuidSchema, to: UuidSchema }).parse(req.query);
    successResponse(res, {
      path: await sideCalculationService.getRelationshipPath(from, to),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      reference_person_id: UuidSchema,
      target_person_ids: z.array(UuidSchema),
    });
    const { reference_person_id, target_person_ids } = schema.parse(req.body);
    const results = await sideCalculationService.batchDetermineSide(
      reference_person_id,
      target_person_ids
    );
    successResponse(res, Object.fromEntries(results));
  } catch (error) {
    next(error);
  }
});

router.get('/ancestor', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { person1, person2 } = z
      .object({ person1: UuidSchema, person2: UuidSchema })
      .parse(req.query);
    successResponse(res, {
      common_ancestor: await sideCalculationService.findCommonAncestor(person1, person2),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
