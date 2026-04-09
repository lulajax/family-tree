/**
 * API shared types
 */

export type UUID = string;

export type Gender = 'male' | 'female' | 'unknown';

export type RelationshipType = 'parent_child' | 'spouse' | 'sibling';

export type Side = 'paternal' | 'maternal' | 'affinity' | 'self' | 'unknown';

export type ImportJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ResponseMeta {
  timestamp: string;
  request_id: string;
  page?: number;
  limit?: number;
  total?: number;
  offset?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface Family {
  id: UUID;
  name: string;
  description: string | null;
  root_person_id: UUID | null;
  generation_name: string | null;
  hall_name: string | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
}

export type UserRole = 'admin' | 'editor' | 'member' | 'viewer';

export interface User {
  id: UUID;
  username: string;
  password_hash: string;
  display_name: string | null;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

export interface FamilyListItem extends Family {
  member_count: number;
}

export interface Person {
  id: UUID;
  family_id: UUID;
  name: string;
  gender: Gender;
  birth_date: Date | null;
  death_date: Date | null;
  bio: string | null;
  photo_url: string | null;
  birth_order: number | null;
  native_place: string | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
}

export interface PersonVersion {
  id: UUID;
  person_id: UUID;
  version: number;
  name: string;
  gender: Gender;
  birth_date: Date | null;
  death_date: Date | null;
  bio: string | null;
  photo_url: string | null;
  birth_order: number | null;
  native_place: string | null;
  valid_from: Date;
  valid_to: Date | null;
  changed_by: string | null;
  change_reason: string | null;
}

export interface Relationship {
  id: UUID;
  from_person_id: UUID;
  to_person_id: UUID;
  type: RelationshipType;
  subtype: string | null;
  start_date: Date | null;
  end_date: Date | null;
  is_active: boolean;
  metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
}

export interface RelationshipVersion {
  id: UUID;
  relationship_id: UUID;
  version: number;
  from_person_id: UUID;
  to_person_id: UUID;
  type: RelationshipType;
  subtype: string | null;
  start_date: Date | null;
  end_date: Date | null;
  is_active: boolean;
  valid_from: Date;
  valid_to: Date | null;
  changed_by: string | null;
}

export interface TreeSpouse {
  id: UUID;
  name: string;
  start_date: string | null;
  end_date: string | null;
}

export interface TreeNode {
  id: UUID;
  name: string;
  gender: Gender;
  birth_date: string | null;
  death_date: string | null;
  generation: number;
  spouses: TreeSpouse[];
  children: TreeNode[];
}

export interface FamilyStats {
  family_id: UUID;
  total_people: number;
  total_relationships: number;
  max_generation_depth: number;
  root_person_id: UUID | null;
}

export interface SearchOptions {
  q: string;
  family_id?: UUID;
  fields: string[];
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  id: UUID;
  type: 'person' | 'event';
  name: string;
  highlight: Record<string, string>;
  score: number;
}

export interface SearchSuggestion {
  value: string;
  type: 'person' | 'event';
}

export interface SearchAdvancedOptions {
  name?: string;
  gender?: Gender;
  birthYearFrom?: number;
  birthYearTo?: number;
  familyId?: UUID;
  hasChildren?: boolean;
  limit?: number;
  offset?: number;
}

export interface TitleResult {
  title: string;
  reverse_title: string;
  relationship_path: string[];
  side: Side;
  distance: number;
  temporal_context: {
    as_of?: string;
    relationship_status: 'current' | 'historical';
    note?: string;
  };
}

export interface CommonAncestorResult {
  ancestor_id: UUID;
  ancestor_name: string;
  person1_generation: number;
  person2_generation: number;
  person1_path: string[];
  person2_path: string[];
}

export interface RelationshipPathNode {
  person_id: UUID;
  relation: string;
}

export interface ImportOptions {
  transaction_mode: 'all_or_nothing' | 'partial' | 'dry_run';
  batch_size: number;
  skip_duplicates: boolean;
  on_conflict: 'merge' | 'skip' | 'replace';
}

export interface ImportRecord {
  id?: string;
  name: string;
  gender?: string;
  birth_date?: string;
  death_date?: string;
  bio?: string;
  father_id?: string;
  mother_id?: string;
  spouse_id?: string;
}

export interface ImportErrorItem {
  row: number;
  field: string;
  message: string;
}

export interface ImportJob {
  id: UUID;
  status: ImportJobStatus;
  summary: {
    total: number;
    processed: number;
    succeeded: number;
    failed: number;
  };
  errors: ImportErrorItem[];
  checkpoint: string | null;
  created_at: Date;
  updated_at: Date;
}
