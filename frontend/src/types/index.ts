// ── 基础类型（与后端对齐） ──

export type Gender = 'male' | 'female' | 'unknown';
export type Side = 'paternal' | 'maternal' | 'affinity' | 'self' | 'unknown';
export type RelationType = 'parent_child' | 'spouse' | 'sibling';

// ── 后端实体 ──

export interface Person {
  id: string;
  family_id: string;
  name: string;
  gender: Gender;
  birth_date: string | null;
  death_date: string | null;
  bio: string | null;
  photo_url: string | null;
  birth_order: number | null;
  native_place: string | null;
  created_at: string;
  updated_at: string;
}

export interface Family {
  id: string;
  name: string;
  description: string | null;
  root_person_id: string | null;
  generation_name: string | null;
  hall_name: string | null;
  created_at: string;
  updated_at: string;
  member_count?: number;
}

export interface Relationship {
  id: string;
  from_person_id: string;
  to_person_id: string;
  type: RelationType;
  subtype: string | null;
  is_active: boolean;
}

// ── 双系图谱 API 响应 ──

export interface PersonNode {
  id: string;
  name: string;
  gender: Gender;
  birth_date: string | null;
  death_date: string | null;
  photo_url: string | null;
  birth_order: number | null;
  native_place: string | null;
  title: string;
  side: Side;
  isFormerSpouse?: boolean;
}

// 递归后代节点（支持无限层级）
export interface DescendantNode {
  person: PersonNode;
  spouses: PersonNode[];
  spouseParents: PersonNode[];
  children: DescendantNode[];
}

// 旁系亲属家庭（叔叔+婶婶+堂兄弟 / 舅舅+舅妈+表兄弟）
export interface CollateralFamily {
  person: PersonNode;
  spouses: PersonNode[];
  children: DescendantNode[];
}

// 配偶家族（妻子+祖先链+小舅子/小姨子）
export interface SpouseFamily {
  person: PersonNode;
  ancestors: AncestorLayer[];
  siblings: CollateralFamily[];
}

export interface AncestorLayer {
  ancestor: PersonNode;
  spouses: PersonNode[];
  siblings: CollateralFamily[];
  spouseParents: PersonNode[];
  spouseSiblings: CollateralFamily[];
  generation: number;
}

export interface DualTreeResponse {
  reference: PersonNode;
  paternal: AncestorLayer[];
  maternal: AncestorLayer[];
  siblings: CollateralFamily[];
  children: DescendantNode[];
  spouses: SpouseFamily[];
}

export interface RelationshipExplanation {
  reference_person_id: string;
  target_person_id: string;
  title: string;
  reverse_title: string;
  side: Side;
  distance: number;
  relationship_path: string[];
  human_readable_path: string[];
  summary: string;
  confidence: 'exact' | 'fallback' | 'unknown';
  common_ancestor: {
    ancestor_id: string;
    ancestor_name: string;
    person1_generation: number;
    person2_generation: number;
  } | null;
}

export type CollaborationRole = 'owner' | 'editor' | 'member' | 'viewer';
export type InviteRole = Exclude<CollaborationRole, 'owner'>;

export interface FamilyMembership {
  id: string;
  family_id: string;
  user_id: string;
  role: CollaborationRole;
  joined_at?: string;
  invited_by?: string | null;
}

export interface FamilyInvite {
  id: string;
  family_id: string;
  invite_code: string;
  role: InviteRole;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  accepted_by: string | null;
  accepted_at: string | null;
}

export interface AuditLog {
  id: string;
  family_id: string | null;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  created_at: string;
}

// ── D3 可视化用 ──

export interface TreeNodeD3 {
  id: string;
  node: PersonNode;
  x?: number;
  y?: number;
}

// ── UI 状态 ──

export enum ViewMode {
  DESKTOP_DUAL = 'desktop_dual',
  DESKTOP_SINGLE = 'desktop_single',
  MOBILE_LIST = 'mobile_list',
}

// ── API 响应包装 ──

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
  meta?: Record<string, unknown>;
}
