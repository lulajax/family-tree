// 性别枚举
export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  UNKNOWN = 'UNKNOWN',
}

// 人员基本信息
export interface Person {
  id: string;
  name: string;
  gender: Gender;
  birthDate?: string;
  deathDate?: string;
  photoUrl?: string;
  generation: number;
  fatherId?: string;
  motherId?: string;
  spouseIds?: string[];
  childrenIds?: string[];
  bio?: string;
  isReference?: boolean;
}

// 家族信息
export interface Family {
  id: string;
  name: string;
  description?: string;
  rootPersonId: string;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
}

// 关系类型
export enum RelationType {
  FATHER = '父亲',
  MOTHER = '母亲',
  SON = '儿子',
  DAUGHTER = '女儿',
  HUSBAND = '丈夫',
  WIFE = '妻子',
  BROTHER = '兄弟',
  SISTER = '姐妹',
  GRANDFATHER = '祖父',
  GRANDMOTHER = '祖母',
  GRANDSON = '孙子',
  GRANDDAUGHTER = '孙女',
  UNCLE = '叔叔',
  AUNT = '姑姑',
  COUSIN = '堂/表兄弟姐妹',
  NEPHEW = '侄子',
  NIECE = '侄女',
  UNKNOWN = '未知',
}

// 关系路径节点
export interface RelationPathNode {
  person: Person;
  relation: string;
  direction: 'up' | 'down' | 'same';
}

// 关系路径
export interface RelationPath {
  nodes: RelationPathNode[];
  distance: number;
}

// 树节点（用于D3可视化）
export interface TreeNode {
  id: string;
  person: Person;
  x?: number;
  y?: number;
  depth: number;
  parent?: TreeNode;
  children?: TreeNode[];
  _children?: TreeNode[]; // 折叠的子节点
  isCollapsed?: boolean;
}

// 视图模式
export enum ViewMode {
  DESKTOP_DUAL = 'desktop_dual',
  DESKTOP_SINGLE = 'desktop_single',
  MOBILE_LIST = 'mobile_list',
}

// 应用状态
export interface AppState {
  currentFamilyId: string | null;
  referencePersonId: string | null;
  selectedPersonId: string | null;
  viewMode: ViewMode;
  isLoading: boolean;
  error: string | null;
}

// 搜索过滤条件
export interface SearchFilters {
  name?: string;
  gender?: Gender;
  generation?: number;
  hasPhoto?: boolean;
}

// API响应
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// 分页响应
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
