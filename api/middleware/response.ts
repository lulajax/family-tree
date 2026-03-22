/**
 * Response helpers middleware.
 */

import { Request, Response, NextFunction } from 'express';

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function responseFormatter(
  _req: Request,
  _res: Response,
  next: NextFunction
): void {
  next();
}

export function parsePagination(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt((req.query.pageSize as string) || (req.query.limit as string) || '20', 10))
  );

  (req as Request & { pagination?: { page: number; pageSize: number; offset: number } }).pagination = {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
  };

  next();
}

export function parseTemporalQuery(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const raw = (req.query.as_of_date as string) || (req.query.as_of as string);
  const asOfDate = raw ? new Date(raw) : undefined;

  (req as Request & { temporalQuery?: { asOfDate?: Date } }).temporalQuery = {
    asOfDate: asOfDate && !Number.isNaN(asOfDate.getTime()) ? asOfDate : undefined,
  };

  next();
}

export function parseFieldSelection(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const raw = req.query.fields as string | undefined;
  (req as Request & { fieldSelection?: string[] }).fieldSelection = raw
    ? raw.split(',').map((field) => field.trim()).filter(Boolean)
    : undefined;
  next();
}

export function parseSorting(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const raw = req.query.sort as string | undefined;
  let sortBy: string | undefined;
  let sortOrder: 'asc' | 'desc' = 'asc';

  if (raw) {
    if (raw.startsWith('-')) {
      sortBy = raw.slice(1);
      sortOrder = 'desc';
    } else if (raw.startsWith('+')) {
      sortBy = raw.slice(1);
    } else {
      sortBy = raw;
    }
  }

  (req as Request & { sorting?: { sortBy?: string; sortOrder: 'asc' | 'desc' } }).sorting = {
    sortBy,
    sortOrder,
  };

  next();
}

export function requestLogger(
  _req: Request,
  _res: Response,
  next: NextFunction
): void {
  next();
}
