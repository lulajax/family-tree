import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { cycleDetectionService, relationshipService } from '../services';
import { validateBody, validateParams } from '../middleware';
import {
  CreateRelationshipSchema,
  CycleCheckSchema,
  UpdateRelationshipSchema,
  UuidSchema,
} from '../types/schemas';
import { successResponse, sendCycleError, sendNotFoundError } from '../utils/response';
import { CycleDetectedError } from '../utils/errors';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const querySchema = z.object({
      person_id: UuidSchema,
      type: z.enum(['parent_child', 'spouse', 'sibling']).optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    });
    const { person_id, type, page, limit } = querySchema.parse(req.query);
    const result = await relationshipService.listPersonRelationships(person_id, {
      type,
      page,
      limit,
    });
    successResponse(res, result.relationships, 200, {
      page,
      limit,
      total: result.total,
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/',
  validateBody(CreateRelationshipSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const created_by = (req as Request & { user?: { id: string } }).user?.id || 'system';
      try {
        const relationship = await relationshipService.createRelationship(req.body, created_by);
        successResponse(res, relationship, 201);
      } catch (error) {
        if (error instanceof CycleDetectedError) {
          sendCycleError(res);
          return;
        }
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/check-cycle',
  validateBody(CycleCheckSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { from_person_id, to_person_id, rel_type } = req.body;
      const would_create_cycle = await cycleDetectionService.wouldCreateCycle(
        from_person_id,
        to_person_id,
        rel_type
      );
      successResponse(res, {
        would_create_cycle,
        message: would_create_cycle ? '会形成循环' : '不会形成循环',
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/between', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const querySchema = z.object({
      person1_id: UuidSchema,
      person2_id: UuidSchema,
      type: z.enum(['parent_child', 'spouse', 'sibling']).optional(),
    });
    const { person1_id, person2_id, type } = querySchema.parse(req.query);
    const relationship = await relationshipService.getRelationshipBetween(
      person1_id,
      person2_id,
      type
    );
    successResponse(res, { relationship });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const paramsSchema = z.object({ id: UuidSchema });
    const querySchema = z.object({
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
    });
    const { id } = paramsSchema.parse(req.params);
    const { from, to } = querySchema.parse(req.query);
    const history = await relationshipService.getRelationshipHistory(
      id,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined
    );
    successResponse(res, history);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: UuidSchema }).parse(req.params);
    const relationship = await relationshipService.getRelationship(id);
    if (!relationship) {
      sendNotFoundError(res, '关系', id);
      return;
    }
    successResponse(res, relationship);
  } catch (error) {
    next(error);
  }
});

router.put(
  '/:id',
  validateParams(z.object({ id: UuidSchema })),
  validateBody(UpdateRelationshipSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated_by = (req as Request & { user?: { id: string } }).user?.id || 'system';
      const relationship = await relationshipService.updateRelationship(
        req.params.id,
        req.body,
        updated_by
      );
      successResponse(res, relationship);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:id',
  validateParams(z.object({ id: UuidSchema })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const deleted_by = (req as Request & { user?: { id: string } }).user?.id || 'system';
      await relationshipService.deleteRelationship(req.params.id, deleted_by);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
