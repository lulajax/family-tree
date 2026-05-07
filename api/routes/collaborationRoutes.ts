import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { familyCollaborationService } from '../services';
import { successResponse } from '../utils/response';
import { AcceptInviteSchema, ActivityQuerySchema, CreateInviteSchema, UuidSchema } from '../types/schemas';

const router = Router();

function currentUserId(req: Request): string | null {
  return (req as Request & { user?: { id: string } }).user?.id ?? null;
}

router.get('/families/:familyId/members', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { familyId } = z.object({ familyId: UuidSchema }).parse(req.params);
    successResponse(res, await familyCollaborationService.listMembers(familyId));
  } catch (error) {
    next(error);
  }
});

router.post('/families/:familyId/invites', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { familyId } = z.object({ familyId: UuidSchema }).parse(req.params);
    const body = CreateInviteSchema.parse(req.body);
    const invite = await familyCollaborationService.createInvite(familyId, currentUserId(req), body);
    successResponse(res, invite, 201);
  } catch (error) {
    next(error);
  }
});

router.post('/invites/:inviteCode/accept', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { inviteCode } = z.object({ inviteCode: z.string().min(1).max(128) }).parse(req.params);
    const { user_id } = AcceptInviteSchema.parse(req.body);
    const membership = await familyCollaborationService.acceptInvite(inviteCode, user_id);
    successResponse(res, membership, 201);
  } catch (error) {
    next(error);
  }
});

router.get('/families/:familyId/activity', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { familyId } = z.object({ familyId: UuidSchema }).parse(req.params);
    const { limit } = ActivityQuerySchema.parse(req.query);
    successResponse(res, await familyCollaborationService.listActivity(familyId, limit));
  } catch (error) {
    next(error);
  }
});

export default router;
