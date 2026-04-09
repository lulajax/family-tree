import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { personService } from '../services';
import { validateBody, validateParams } from '../middleware';
import { successResponse, sendNotFoundError, sendValidationError } from '../utils/response';
import { CreatePersonSchema, UpdatePersonSchema, UuidSchema } from '../types/schemas';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const querySchema = z.object({
      family_id: UuidSchema,
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      gender: z.enum(['male', 'female', 'unknown']).optional(),
      name: z.string().optional(),
    });
    const { family_id, page, limit, gender, name } = querySchema.parse(req.query);
    const result = await personService.listFamilyMembers(family_id, {
      page,
      limit,
      gender,
      name,
    });
    successResponse(res, result.persons, 200, {
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
  validateBody(CreatePersonSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const created_by = (req as Request & { user?: { id: string } }).user?.id || 'system';
      const person = await personService.createPerson(req.body, created_by);
      successResponse(res, person, 201);
    } catch (error) {
      next(error);
    }
  }
);

router.post('/batch-import', (_req: Request, res: Response) => {
  sendValidationError(res, '请使用专门的导入端点 /api/v1/import');
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
    const history = await personService.getPersonHistory(
      id,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined
    );
    successResponse(res, history);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/parents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: UuidSchema }).parse(req.params);
    successResponse(res, await personService.getParents(id));
  } catch (error) {
    next(error);
  }
});

router.get('/:id/children', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: UuidSchema }).parse(req.params);
    successResponse(res, await personService.getChildren(id));
  } catch (error) {
    next(error);
  }
});

router.get('/:id/spouses', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: UuidSchema }).parse(req.params);
    successResponse(res, await personService.getSpouses(id));
  } catch (error) {
    next(error);
  }
});

router.post('/:id/add-relative', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: UuidSchema }).parse(req.params);
    const bodySchema = z.object({
      relation_type: z.enum(['father', 'mother', 'child', 'spouse', 'sibling']),
      person: z.object({
        name: z.string().min(1).max(100),
        gender: z.enum(['male', 'female', 'unknown']).optional(),
        birth_date: z.string().optional(),
        death_date: z.string().optional(),
        bio: z.string().max(5000).optional(),
      }),
    });
    const body = bodySchema.parse(req.body);
    const created_by = (req as Request & { user?: { id: string } }).user?.id || 'system';
    const result = await personService.addRelative(id, body, created_by);
    successResponse(res, result, 201);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/link-relative', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: UuidSchema }).parse(req.params);
    const bodySchema = z.object({
      relation_type: z.enum(['father', 'mother', 'child', 'spouse', 'sibling']),
      existing_person_id: UuidSchema,
    });
    const body = bodySchema.parse(req.body);
    const created_by = (req as Request & { user?: { id: string } }).user?.id || 'system';
    const result = await personService.linkExistingRelative(id, body.existing_person_id, body.relation_type, created_by);
    successResponse(res, result, 201);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const paramsSchema = z.object({ id: UuidSchema });
    const querySchema = z.object({ as_of: z.string().datetime().optional() });
    const { id } = paramsSchema.parse(req.params);
    const { as_of } = querySchema.parse(req.query);
    const person = await personService.getPerson(id, as_of ? new Date(as_of) : undefined);
    if (!person) {
      sendNotFoundError(res, '人员', id);
      return;
    }
    successResponse(res, person);
  } catch (error) {
    next(error);
  }
});

router.put(
  '/:id',
  validateParams(z.object({ id: UuidSchema })),
  validateBody(UpdatePersonSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated_by = (req as Request & { user?: { id: string } }).user?.id || 'system';
      const person = await personService.updatePerson(req.params.id, req.body, updated_by);
      successResponse(res, person);
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
      await personService.deletePerson(req.params.id, deleted_by);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
