import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { importService } from '../services';
import { ImportOptionsSchema } from '../types/schemas';
import { commonErrors, errorResponse, successResponse } from '../utils/response';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

router.post(
  '/',
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        errorResponse(res, commonErrors.validation('请上传文件'), 400);
        return;
      }

      const bodySchema = z.object({
        family_id: z.string().uuid(),
        options: z.string().optional(),
      });
      const { family_id, options } = bodySchema.parse(req.body);
      const parsedOptions = options
        ? ImportOptionsSchema.parse(JSON.parse(options))
        : ImportOptionsSchema.parse({});
      const file_type = req.file.mimetype === 'text/csv' ? 'csv' : 'xlsx';
      const created_by = (req as Request & { user?: { id: string } }).user?.id || 'system';
      const job = await importService.createImportJob(
        req.file.buffer,
        file_type,
        parsedOptions,
        family_id,
        created_by
      );
      successResponse(res, job, 202);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/template', (_req: Request, res: Response) => {
  const template = `id,name,gender,birth_date,death_date,bio,father_id,mother_id,spouse_id
,张三,male,1980-01-01,,简介内容,,,
,李四,female,1982-03-15,,,,,
,王五,male,2005-06-01,,,张三,李四,`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="import_template.csv"');
  res.send(template);
});

router.post(
  '/validate',
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        errorResponse(res, commonErrors.validation('请上传文件'), 400);
        return;
      }

      successResponse(res, {
        valid: true,
        file_name: req.file.originalname,
        file_size: req.file.size,
        message: '文件上传成功',
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/:jobId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { jobId } = z.object({ jobId: z.string().uuid() }).parse(req.params);
    const job = await importService.getImportJob(jobId);
    if (!job) {
      errorResponse(res, commonErrors.notFound('导入任务', jobId), 404);
      return;
    }
    successResponse(res, job);
  } catch (error) {
    next(error);
  }
});

router.post('/:jobId/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { jobId } = z.object({ jobId: z.string().uuid() }).parse(req.params);
    const cancelled = await importService.cancelImportJob(jobId);
    if (!cancelled) {
      errorResponse(res, commonErrors.badRequest('任务无法取消或不存在'), 400);
      return;
    }
    successResponse(res, { message: '导入任务已取消' });
  } catch (error) {
    next(error);
  }
});

export default router;
