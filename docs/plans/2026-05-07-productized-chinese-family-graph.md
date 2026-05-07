# 中文家庭关系图谱产品化 Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** 把当前“双系族谱系统”迭代成一款面向中文家庭的产品化 MVP：用户可以在手机上快速建立家庭关系图谱，点击任意亲戚即可知道“我该怎么称呼 TA”、关系路径、父系/母系/姻亲归属，并邀请家人协作补全资料。

**Architecture:** 继续沿用当前 V1 收敛架构：React/Vite 前端 + Express/TypeScript API + PostgreSQL。第一阶段不引入 Redis、不引入复杂实时协同，先用数据库中的 membership / invite / audit log 支撑家庭空间与协作，用现有 DualTreeService / TitleCalculationService 作为产品核心。

**Tech Stack:** React 18, Vite, TypeScript, Tailwind CSS, TanStack Query, Zustand, Express, PostgreSQL, Zod, Jest/Vitest.

---

## 0. 产品定位

### 一句话

**给中文家庭用的现代亲属关系地图：帮年轻人看懂亲戚关系、知道怎么称呼、和家人一起补全家庭记忆。**

### 核心差异化

1. **中文称谓优先**：不只是 family tree，而是“我应该叫 TA 什么”。
2. **双系族谱**：父系、母系、姻亲都同等重要，而不是传统单父系宗族谱。
3. **手机端优先**：家庭资料常在微信聊天、聚会、春节、清明场景中产生。
4. **家庭协作**：资料由多人共同补全，有邀请、权限、修改记录。
5. **情感资料沉淀**：人不只是节点，还应有照片、故事、出生地、备注、资料来源。

### MVP 用户故事

- 作为年轻用户，我可以创建一个家庭空间，并把“我”设为中心人物。
- 作为用户，我可以快速添加父母、配偶、子女、兄弟姐妹、舅舅、姑姑、姨妈、堂表亲。
- 作为用户，我可以点击任意亲戚，看见：称谓、反向称谓、关系路径、父系/母系/姻亲、共同祖先。
- 作为用户，我可以在手机上浏览家庭关系图谱，不需要横向拖到迷路。
- 作为用户，我可以邀请家人加入家庭空间，让他们补充资料。
- 作为家庭管理员，我可以看到谁修改了什么，并撤销明显错误。

### 不做 / 暂缓

- 暂不做 DNA、公开资料库、全球寻亲。
- 暂不做复杂实时多人编辑。
- 暂不做 AI OCR 族谱导入，留到 V2。
- 暂不做 App 原生端，先保证 H5 / 微信内浏览体验。

---

## 1. 当前代码基础判断

### 已有资产

- 后端已有 `TitleCalculationService` 和 `titleRules.ts`，称谓规则基础较好。
- 后端已有 `DualTreeService`，能以参考人为中心构造父系、母系、配偶、兄弟姐妹、子女结构。
- 前端已有 `FamilyDashboard`、`DualFamilyTree`、`MobileTreeView`、`PersonDetailPanel`、`AddRelativeDialog`。
- API 已有 family/person/relationship/search/import/auth 模块。
- 数据库已有 `families/persons/relationships/*_versions/life_events`。

### 主要缺口

- 缺少产品化首页 / onboarding。
- 缺少“称谓卡片 / 关系解释”的核心体验包装。
- 缺少 family membership / invite / role 权限。
- 缺少 audit log / contribution feed。
- 称谓、路径、循环检测几乎没有测试保护。
- `frontend/.env.example` 默认 `/api` 与后端 `/api/v1` 有潜在不一致。
- 手机端应从“树图缩放”转向“关系卡片 + 分组列表 + 焦点切换”的信息架构。

---

## 2. 产品化里程碑

### Milestone A — 可运行和质量基线

目标：确保项目可安装、可构建、关键逻辑有测试。

验收：

```bash
cd api && npm install && npm run typecheck && npm run build
cd frontend && npm install && npm run build
```

并新增称谓规则测试，覆盖父母、祖父母、外祖父母、叔伯姑舅姨、堂表亲、配偶亲属。

### Milestone B — 核心称谓体验

目标：把“点击任意亲戚知道怎么称呼”打磨成产品主体验。

前端新增：

- `RelationshipBadge`
- `KinshipCard`
- `RelationshipPathView`
- `FocusPersonSwitcher`

后端新增或增强：

- `GET /api/v1/persons/:id/relationship-to?reference=...`
- 返回 title、reverse_title、side、distance、path、human_readable_path、common_ancestor。

### Milestone C — 手机端优先的信息架构

目标：手机端不是强行展示大树，而是以“我为中心”的亲属分组。

移动端首页结构：

```text
顶部：当前中心人物 + 切换中心
核心卡：我是谁 / 当前家庭 / 亲属数量
快捷添加：父亲、母亲、配偶、子女、兄弟姐妹
分组列表：
  - 父系亲属
  - 母系亲属
  - 配偶 / 姻亲
  - 子女后代
点击任意人：底部抽屉展示称谓卡 + 关系路径 + 编辑入口
```

### Milestone D — 家庭协作

目标：一个家庭空间可以邀请家人协作，成员有角色。

新增表：

- `users` 如果当前 AuthService 还没有持久化表，需要补齐。
- `family_memberships`
- `family_invites`
- `audit_logs`

角色：

- owner：管理家庭、邀请成员、删除家庭。
- editor：添加/编辑人物和关系。
- member：查看和评论/补充故事。
- viewer：只读。

### Milestone E — 家庭记忆资料

目标：人不只是节点，还能保存故事、照片、事件。

新增/增强：

- `life_events` 前端编辑入口。
- `person_notes` 或直接扩展 `life_events`。
- `source` 字段：资料来源，如“外婆口述”“旧族谱第 3 页”。
- 人物详情页展示“故事时间线”。

---

## 3. 具体任务分解

### Task 1: 修正前端 API 默认配置

**Objective:** 消除 `/api` 与 `/api/v1` 不一致的问题。

**Files:**
- Modify: `frontend/.env.example`
- Verify: `frontend/src/api/client.ts`

**Step 1: 修改 env example**

把：

```env
VITE_API_BASE_URL=/api
```

改成：

```env
VITE_API_BASE_URL=/api/v1
```

**Step 2: 验证**

```bash
cd frontend
npm run build
```

Expected: 构建通过。

**Step 3: Commit**

```bash
git add frontend/.env.example
git commit -m "fix: align frontend api base url with backend prefix"
```

---

### Task 2: 增加称谓规则单元测试

**Objective:** 为产品核心能力建立回归保护。

**Files:**
- Create: `api/services/titleRules.test.ts`
- Modify: `api/package.json` 如 Jest 配置不足则补齐。

**Test cases:**

覆盖 `matchTitleWithFallback`：

```ts
expect(matchTitleWithFallback('parent', 'male', 'paternal', null, 'male')).toBe('父亲');
expect(matchTitleWithFallback('parent>parent', 'male', 'paternal', null, 'male')).toBe('爷爷');
expect(matchTitleWithFallback('parent>parent', 'male', 'maternal', null, 'male')).toBe('外公');
expect(matchTitleWithFallback('parent>sibling', 'male', 'paternal', true, 'male')).toBe('伯父');
expect(matchTitleWithFallback('parent>sibling', 'male', 'paternal', false, 'male')).toBe('叔叔');
expect(matchTitleWithFallback('parent>sibling', 'male', 'maternal', null, 'male')).toBe('舅舅');
expect(matchTitleWithFallback('parent>sibling>child', 'female', 'maternal', true, 'male')).toBe('表姐');
expect(matchTitleWithFallback('spouse>parent', 'female', 'affinity', null, 'male')).toBe('岳母');
```

**Run:**

```bash
cd api
npm test -- titleRules.test.ts
```

**Expected:** PASS.

**Commit:**

```bash
git add api/services/titleRules.test.ts api/package.json
git commit -m "test: cover chinese kinship title rules"
```

---

### Task 3: 新增关系解释 DTO

**Objective:** 后端提供适合前端展示的“称谓卡片”数据结构。

**Files:**
- Modify: `api/types/index.ts`
- Modify: `api/services/TitleCalculationService.ts`
- Modify: `api/routes/personRoutes.ts` or create dedicated route in `api/routes/titleRoutes.ts`

**Response shape:**

```ts
export interface RelationshipExplanation {
  reference_person_id: string;
  target_person_id: string;
  title: string;
  reverse_title: string;
  side: 'paternal' | 'maternal' | 'affinity' | 'self';
  distance: number;
  relationship_path: string[];
  human_readable_path: string[];
  summary: string;
  confidence: 'exact' | 'fallback' | 'unknown';
}
```

**Human readable mapping:**

```ts
const RELATION_LABELS = {
  parent: '父母',
  child: '子女',
  sibling: '兄弟姐妹',
  spouse: '配偶',
};
```

**Example summary:**

```text
你应该称呼 TA 为「表姐」。关系路径：你 → 母亲 → 舅舅/姨妈 → TA。
```

**Endpoint:**

```http
GET /api/v1/persons/:id/relationship-to?reference=<personId>
```

**Verify:**

用现有测试数据库或 mock service 测试返回结构。

**Commit:**

```bash
git add api/types api/services api/routes
 git commit -m "feat: add relationship explanation api"
```

---

### Task 4: 前端新增 KinshipCard

**Objective:** 把称谓、系别、关系路径包装成核心产品 UI。

**Files:**
- Create: `frontend/src/components/kinship/KinshipCard.tsx`
- Create: `frontend/src/components/kinship/RelationshipPathView.tsx`
- Modify: `frontend/src/components/index.ts`
- Modify: `frontend/src/types/index.ts`

**Props:**

```ts
interface KinshipCardProps {
  title: string;
  reverseTitle?: string;
  side: Side;
  distance: number;
  path: string[];
  summary?: string;
  compact?: boolean;
}
```

**UI requirements:**

- 大号显示称谓，例如「表姐」。
- 小字显示“母系 · 3 步关系”。
- 路径用 chip 展示：我 → 母亲 → 舅舅 → 表姐。
- `side` 使用颜色区分：父系蓝、母系粉、姻亲紫、本人绿。
- 手机端 compact 布局。

**Verify:**

```bash
cd frontend
npm run build
```

**Commit:**

```bash
git add frontend/src/components/kinship frontend/src/types/index.ts frontend/src/components/index.ts
 git commit -m "feat: add kinship relationship card"
```

---

### Task 5: 在 PersonDetailPanel 中突出称谓卡片

**Objective:** 用户点击亲戚时第一眼看到“我该叫 TA 什么”。

**Files:**
- Modify: `frontend/src/components/person/PersonDetailPanel.tsx`
- Modify: `frontend/src/api/queries.ts`

**Implementation:**

新增 query：

```ts
export function useRelationshipExplanation(targetPersonId: string | null, referencePersonId: string | null) {
  return useQuery({
    queryKey: ['relationshipExplanation', targetPersonId, referencePersonId],
    queryFn: () => apiClient<RelationshipExplanation>(`/persons/${targetPersonId}/relationship-to?reference=${referencePersonId}`),
    enabled: !!targetPersonId && !!referencePersonId && targetPersonId !== referencePersonId,
  });
}
```

在详情面板顶部展示：

- 如果 target = reference：显示“本人”。
- 如果 API 成功：展示 `KinshipCard`。
- 如果失败：回退展示 `person.title`。

**Verify:**

```bash
cd frontend
npm run build
```

**Commit:**

```bash
git add frontend/src/components/person/PersonDetailPanel.tsx frontend/src/api/queries.ts
 git commit -m "feat: highlight kinship title in person details"
```

---

### Task 6: 移动端重构为亲属分组列表

**Objective:** 手机端优先，让用户不用缩放大树也能看懂关系。

**Files:**
- Modify: `frontend/src/components/mobile/MobileTreeView.tsx`
- Create: `frontend/src/components/mobile/RelativeGroupSection.tsx`

**Groups:**

```ts
const groups = [
  { key: 'paternal', title: '父系亲属' },
  { key: 'maternal', title: '母系亲属' },
  { key: 'affinity', title: '配偶与姻亲' },
  { key: 'children', title: '子女后代' },
  { key: 'siblings', title: '兄弟姐妹' },
];
```

**Acceptance:**

- 每个亲戚行显示头像、姓名、称谓、简短关系。
- 点击行打开底部抽屉。
- 支持“设为中心人物”。

**Verify:**

```bash
cd frontend
npm run build
```

**Commit:**

```bash
git add frontend/src/components/mobile
 git commit -m "feat: optimize mobile relative browsing"
```

---

### Task 7: 设计家庭协作数据库 schema

**Objective:** 支撑家庭空间邀请和权限。

**Files:**
- Create: `database/migrations/003_family_collaboration.sql`
- Modify: `database/schema.sql`

**Tables:**

```sql
CREATE TABLE IF NOT EXISTS family_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'editor', 'member', 'viewer')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  invited_by UUID,
  UNIQUE (family_id, user_id)
);

CREATE TABLE IF NOT EXISTS family_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  invite_code VARCHAR(64) NOT NULL UNIQUE,
  role VARCHAR(20) NOT NULL DEFAULT 'member',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  accepted_by UUID,
  accepted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  actor_user_id UUID,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  before JSONB,
  after JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

**Indexes:**

```sql
CREATE INDEX IF NOT EXISTS idx_family_memberships_family ON family_memberships(family_id);
CREATE INDEX IF NOT EXISTS idx_family_invites_code ON family_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_audit_logs_family_created ON audit_logs(family_id, created_at DESC);
```

**Verify:**

```bash
psql -U postgres -d genealogy_db -f database/migrations/003_family_collaboration.sql
```

**Commit:**

```bash
git add database/schema.sql database/migrations/003_family_collaboration.sql
 git commit -m "feat: add family collaboration schema"
```

---

### Task 8: 家庭邀请 API

**Objective:** 支持生成邀请链接、接受邀请、查看成员。

**Files:**
- Create: `api/services/FamilyCollaborationService.ts`
- Create: `api/routes/collaborationRoutes.ts`
- Modify: `api/routes/index.ts`
- Modify: `api/types/schemas.ts`

**Endpoints:**

```http
GET  /api/v1/families/:familyId/members
POST /api/v1/families/:familyId/invites
POST /api/v1/invites/:inviteCode/accept
GET  /api/v1/families/:familyId/activity
```

**Rules:**

- owner/editor 可邀请。
- 默认邀请角色 `member`。
- accept 后写入 `family_memberships`。
- 所有 person/relationship 修改后逐步接入 audit log。

**Verify:**

新增 service 单元测试或 API 集成测试。

**Commit:**

```bash
git add api/services/FamilyCollaborationService.ts api/routes/collaborationRoutes.ts api/routes/index.ts api/types/schemas.ts
 git commit -m "feat: add family collaboration api"
```

---

### Task 9: 前端家庭协作入口

**Objective:** 用户能在家庭页面邀请家人。

**Files:**
- Create: `frontend/src/components/family/InviteFamilyDialog.tsx`
- Create: `frontend/src/components/family/FamilyMembersPanel.tsx`
- Modify: `frontend/src/components/family/FamilyHeader.tsx`
- Modify: `frontend/src/api/queries.ts`
- Modify: `frontend/src/api/mutations.ts`

**UI:**

- FamilyHeader 增加“邀请家人”按钮。
- Dialog 显示邀请链接、复制按钮、角色选择。
- MembersPanel 显示成员列表和角色。

**Verify:**

```bash
cd frontend
npm run build
```

**Commit:**

```bash
git add frontend/src/components/family frontend/src/api
 git commit -m "feat: add family invite UI"
```

---

### Task 10: 产品化空状态和 onboarding

**Objective:** 新用户第一次进入时知道该做什么。

**Files:**
- Modify: `frontend/src/pages/FamilyListPage.tsx`
- Modify: `frontend/src/pages/FamilyDashboard.tsx`
- Create: `frontend/src/components/onboarding/QuickStartChecklist.tsx`

**Checklist:**

```text
1. 创建家庭
2. 添加“我”
3. 添加父母
4. 添加一位你不知道怎么称呼的亲戚
5. 邀请家人补充
```

**Acceptance:**

- 没有 family 时，页面表达产品价值，而不是只有“创建家族”。
- 没有 root person 时，引导用户创建“我”。
- 创建成功后直接进入手机/桌面可理解的关系图谱。

**Commit:**

```bash
git add frontend/src/pages frontend/src/components/onboarding
 git commit -m "feat: add product onboarding flow"
```

---

## 4. V1 产品验收标准

### 核心体验验收

1. 用户能创建家庭空间。
2. 用户能把自己设为中心人物。
3. 用户能快速添加父母、配偶、子女、兄弟姐妹。
4. 用户点击任意亲戚，能看到醒目的中文称谓。
5. 用户能看到关系路径，例如：`我 → 母亲 → 舅舅 → 表姐`。
6. 用户能切换中心人物，族谱围绕新人物重算称谓。
7. 手机端可完成浏览、添加、查看称谓、切换中心人物。
8. 用户能生成邀请链接，家人能加入家庭空间。

### 技术验收

```bash
cd api && npm run typecheck && npm run build && npm test
cd frontend && npm run build
```

### 产品质量验收

- 空状态不再像内部后台，而是清晰表达产品价值。
- 任何“亲戚详情”页面第一屏必须展示称谓。
- 称谓失败时必须有 fallback：亲属 / 姻亲 / 未知关系，不能白屏。
- 移动端 375px 宽度下主要操作不横向溢出。

---

## 5. 推荐执行顺序

1. Task 1：修 API base URL。
2. Task 2：加称谓测试。
3. Task 3：关系解释 API。
4. Task 4-5：KinshipCard + 人物详情称谓核心体验。
5. Task 6：移动端亲属分组。
6. Task 10：onboarding 产品化。
7. Task 7-9：家庭协作 schema/API/UI。

先做 1-6，可以形成可演示的产品核心；再做 7-9，补协作壁垒。

---

## 6. 后续 V2 想法

- Excel/CSV 智能导入向导。
- AI 解析中文亲属描述：例如“我妈的二哥的女儿”。
- OCR 纸质族谱。
- 家庭故事时间线。
- 微信分享卡片：“我和 TA 的关系”。
- 活人隐私保护：对非成员隐藏生日、联系方式、照片。
- 关系置信度和资料来源。
