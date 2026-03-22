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
  created_at: string;
  updated_at: string;
}

export interface Family {
  id: string;
  name: string;
  description: string | null;
  root_person_id: string | null;
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
  title: string;
  side: Side;
}

// 递归后代节点（支持无限层级）
export interface DescendantNode {
  person: PersonNode;
  spouse: PersonNode | null;
  children: DescendantNode[];
}

// 旁系亲属家庭（叔叔+婶婶+堂兄弟 / 舅舅+舅妈+表兄弟）
export interface CollateralFamily {
  person: PersonNode;           // 叔叔/姑姑/舅舅/姨妈
  spouse: PersonNode | null;    // 婶婶/姑父/舅妈/姨父
  children: DescendantNode[];   // 堂兄弟/表兄弟（递归后代）
}

// 配偶家族（妻子+祖先链+小舅子/小姨子）
export interface SpouseFamily {
  person: PersonNode;           // 妻子/丈夫
  ancestors: AncestorLayer[];   // 配偶的祖先链（岳父→岳祖父→...无限深度）
  siblings: CollateralFamily[]; // 小舅子/小姨子（含他们的配偶和子女）
}

export interface AncestorLayer {
  ancestor: PersonNode;
  spouse: PersonNode | null;
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
