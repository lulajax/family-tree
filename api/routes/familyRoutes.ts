import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { familyService, dualTreeService } from '../services';
import { validateBody, validateParams } from '../middleware';
import { successResponse, sendNotFoundError } from '../utils/response';
import { CreateFamilySchema, UpdateFamilySchema, UuidSchema } from '../types/schemas';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const querySchema = z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      name: z.string().optional(),
    });
    const { page, limit, name } = querySchema.parse(req.query);
    const result = await familyService.listFamilies({ page, limit, name });
    successResponse(res, result.families, 200, {
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
  validateBody(CreateFamilySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const created_by = (req as Request & { user?: { id: string } }).user?.id || 'system';
      const family = await familyService.createFamily(
        req.body.name,
        req.body.description,
        req.body.root_person_id,
        created_by,
        req.body.generation_name,
        req.body.hall_name,
      );
      successResponse(res, family, 201);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: UuidSchema }).parse(req.params);
    const family = await familyService.getFamily(id);
    if (!family) {
      sendNotFoundError(res, '家族', id);
      return;
    }
    successResponse(res, family);
  } catch (error) {
    next(error);
  }
});

router.put(
  '/:id',
  validateParams(z.object({ id: UuidSchema })),
  validateBody(UpdateFamilySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const family = await familyService.updateFamily(req.params.id, req.body);
      successResponse(res, family);
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
      await familyService.deleteFamily(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

router.get('/:id/tree', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const paramsSchema = z.object({ id: UuidSchema });
    const querySchema = z.object({
      root: UuidSchema.optional(),
      depth: z.coerce.number().int().min(1).max(10).default(6),
      as_of: z.string().datetime().optional(),
    });
    const { id } = paramsSchema.parse(req.params);
    const { root, depth, as_of } = querySchema.parse(req.query);
    const tree = await familyService.getFamilyTree(id, {
      rootPersonId: root,
      depth,
      asOfDate: as_of ? new Date(as_of) : undefined,
    });

    if (!tree) {
      sendNotFoundError(res, '家族树', id);
      return;
    }

    successResponse(res, tree);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/dual-tree', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: UuidSchema }).parse(req.params);
    const querySchema = z.object({
      reference: UuidSchema,
      depth: z.coerce.number().int().min(1).max(10).default(5),
    });
    const { reference, depth } = querySchema.parse(req.query);
    const tree = await dualTreeService.buildDualTree(id, reference, depth);
    successResponse(res, tree);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: UuidSchema }).parse(req.params);
    successResponse(res, await familyService.getFamilyStats(id));
  } catch (error) {
    next(error);
  }
});

router.put('/:id/root', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: UuidSchema }).parse(req.params);
    const { person_id } = z.object({ person_id: UuidSchema }).parse(req.body);
    successResponse(res, await familyService.setRootPerson(id, person_id));
  } catch (error) {
    next(error);
  }
});

export default router;
