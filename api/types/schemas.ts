/**
 * 双系族谱系统 - Zod校验Schema
 */

import { z } from 'zod';

// ==================== 基础Schema ====================

export const GenderSchema = z.enum(['male', 'female', 'unknown']);

export const RelationshipTypeSchema = z.enum(['parent_child', 'spouse', 'sibling']);

export const SideSchema = z.enum(['paternal', 'maternal', 'affinity', 'self']);

export const TransactionModeSchema = z.enum(['all_or_nothing', 'partial', 'dry_run']);

export const ConflictStrategySchema = z.enum(['merge', 'skip', 'replace']);

// ==================== UUID Schema ====================

export const UuidSchema = z.string().uuid('无效的UUID格式');

// ==================== 日期 Schema ====================

export const DateStringSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式必须为YYYY-MM-DD')
  .or(z.string().datetime());

export const OptionalDateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式必须为YYYY-MM-DD')
  .or(z.string().datetime())
  .optional()
  .nullable();

// ==================== 分页 Schema ====================

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ==================== 人员相关Schema ====================

export const CreatePersonSchema = z.object({
  family_id: UuidSchema,
  name: z.string().min(1, '姓名不能为空').max(100, '姓名过长'),
  gender: GenderSchema.default('unknown'),
  birth_date: OptionalDateSchema,
  death_date: OptionalDateSchema,
  bio: z.string().max(5000, '简介过长').optional(),
});

export const UpdatePersonSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  gender: GenderSchema.optional(),
  birth_date: OptionalDateSchema,
  death_date: OptionalDateSchema,
  bio: z.string().max(5000).optional(),
  change_reason: z.string().max(500).optional(),
});

export const PersonHistoryQuerySchema = z.object({
  from: DateStringSchema.optional(),
  to: DateStringSchema.optional(),
});

// ==================== 关系相关Schema ====================

export const CreateRelationshipSchema = z.object({
  from_person_id: UuidSchema,
  to_person_id: UuidSchema,
  type: RelationshipTypeSchema,
  subtype: z.string().max(50).optional(),
  start_date: OptionalDateSchema,
  end_date: OptionalDateSchema,
  metadata: z.record(z.unknown()).optional(),
});

export const UpdateRelationshipSchema = z.object({
  type: RelationshipTypeSchema.optional(),
  subtype: z.string().max(50).optional(),
  start_date: OptionalDateSchema,
  end_date: OptionalDateSchema,
  is_active: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ==================== 称谓计算Schema ====================

export const CalculateTitleQuerySchema = z.object({
  from: UuidSchema,
  to: UuidSchema,
  as_of: z.string().datetime().optional(),
});

// ==================== 批量导入Schema ====================

export const ImportOptionsSchema = z.object({
  transaction_mode: TransactionModeSchema.default('partial'),
  batch_size: z.number().int().min(1).max(1000).default(100),
  skip_duplicates: z.boolean().default(true),
  on_conflict: ConflictStrategySchema.default('merge'),
});

export const BatchImportQuerySchema = z.object({
  options: z.string().optional(), // JSON字符串，需要解析
});

// ==================== 搜索Schema ====================

export const SearchQuerySchema = z.object({
  q: z.string().min(1, '搜索关键词不能为空').max(200, '搜索关键词过长'),
  family_id: UuidSchema.optional(),
  fields: z.string().default('name,bio')
    .transform(val => val.split(',').map(f => f.trim())),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// ==================== 家族树Schema ====================

export const FamilyTreeQuerySchema = z.object({
  root: UuidSchema.optional(),
  depth: z.coerce.number().int().min(1).max(10).default(6),
  as_of: z.string().datetime().optional(),
});

// ==================== 家族Schema ====================

export const CreateFamilySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  root_person_id: UuidSchema.optional(),
});

export const UpdateFamilySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(2000).optional(),
  root_person_id: UuidSchema.optional(),
});

// ==================== 系别判定Schema ====================

export const DetermineSideQuerySchema = z.object({
  reference: UuidSchema,
  target: UuidSchema,
});

// ==================== 循环检测Schema ====================

export const CycleCheckSchema = z.object({
  from_person_id: UuidSchema,
  to_person_id: UuidSchema,
  rel_type: RelationshipTypeSchema,
});

// ==================== 导入记录Schema ====================

export const ImportRecordSchema = z.object({
  name: z.string().min(1),
  gender: z.enum(['male', 'female', 'unknown', 'M', 'F', '']).optional(),
  birth_date: z.string().optional(),
  death_date: z.string().optional(),
  bio: z.string().optional(),
  father_id: z.string().optional(),
  mother_id: z.string().optional(),
  spouse_id: z.string().optional(),
}).passthrough();

// ==================== 类型导出 ====================

export type CreatePersonInput = z.infer<typeof CreatePersonSchema>;
export type UpdatePersonInput = z.infer<typeof UpdatePersonSchema>;
export type CreateRelationshipInput = z.infer<typeof CreateRelationshipSchema>;
export type UpdateRelationshipInput = z.infer<typeof UpdateRelationshipSchema>;
export type CalculateTitleQuery = z.infer<typeof CalculateTitleQuerySchema>;
export type ImportOptionsInput = z.infer<typeof ImportOptionsSchema>;
export type SearchQuery = z.infer<typeof SearchQuerySchema>;
export type FamilyTreeQuery = z.infer<typeof FamilyTreeQuerySchema>;
export type CreateFamilyInput = z.infer<typeof CreateFamilySchema>;
export type UpdateFamilyInput = z.infer<typeof UpdateFamilySchema>;
export type DetermineSideQuery = z.infer<typeof DetermineSideQuerySchema>;
export type CycleCheckInput = z.infer<typeof CycleCheckSchema>;
