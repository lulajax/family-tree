import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { query } from '../config/database';
import { UuidSchema } from '../types/schemas';
import { NotFoundError, ValidationError } from '../utils/errors';

const router = Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const photoDir = path.join(UPLOAD_DIR, 'photos');
    if (!fs.existsSync(photoDir)) {
      fs.mkdirSync(photoDir, { recursive: true });
    }
    cb(null, photoDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new ValidationError(`不支持的文件格式: ${ext}，允许: ${allowed.join(', ')}`) as any);
    }
  },
});

// POST /persons/:id/photo
router.post('/:id/photo', upload.single('photo'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = UuidSchema.parse(req.params.id);

    if (!req.file) {
      throw new ValidationError('请上传照片文件');
    }

    // Verify person exists
    const person = await query('SELECT id FROM persons WHERE id = $1', [id]);
    if (person.rows.length === 0) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      throw new NotFoundError('人员', id);
    }

    const photoUrl = `/uploads/photos/${req.file.filename}`;

    // Update person's photo_url
    await query('UPDATE persons SET photo_url = $1, updated_at = NOW() WHERE id = $2', [photoUrl, id]);

    res.json({
      success: true,
      data: { photo_url: photoUrl },
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /persons/:id/photo
router.delete('/:id/photo', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = UuidSchema.parse(req.params.id);

    const result = await query<{ photo_url: string | null }>('SELECT photo_url FROM persons WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      throw new NotFoundError('人员', id);
    }

    const oldPhotoUrl = result.rows[0].photo_url;
    if (oldPhotoUrl) {
      const filePath = path.join(process.cwd(), oldPhotoUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await query('UPDATE persons SET photo_url = NULL, updated_at = NOW() WHERE id = $1', [id]);

    res.json({
      success: true,
      data: null,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
