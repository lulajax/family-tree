import { Router, Request, Response, NextFunction } from 'express';
import { authService } from '../services/AuthService';
import { authenticateToken } from '../middleware/auth';
import { RegisterSchema, LoginSchema } from '../types/schemas';
import { ValidationError } from '../utils/errors';

const router = Router();

// POST /auth/register
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('注册参数无效', { errors: parsed.error.flatten().fieldErrors });
    }

    const { username, password, display_name } = parsed.data;
    const result = await authService.register(username, password, display_name);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// POST /auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('登录参数无效', { errors: parsed.error.flatten().fieldErrors });
    }

    const { username, password } = parsed.data;
    const result = await authService.login(username, password);

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// GET /auth/me
router.get('/me', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      res.json({ success: true, data: null });
      return;
    }

    const user = await authService.getUserById(req.user.sub);

    res.json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
