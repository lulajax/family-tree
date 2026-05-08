# family-tree 下一阶段开发排期与里程碑

> **For Hermes:** Use subagent-driven-development skill to implement milestone tasks one-by-one. Prefer TDD for backend logic and run verification commands before each commit.

**Goal:** 用 4 周把 family-tree 从“可运行的族谱 CRUD”推进到“可演示的中文家庭关系图谱 MVP”。

**Architecture:** 继续沿用 React/Vite + Express/TypeScript + PostgreSQL。优先打磨称谓解释、移动端关系浏览、onboarding，再补家庭协作 UI；不引入 Redis、实时协同、AI/OCR 等 V2 能力。

**Tech Stack:** React 18, Vite, TypeScript, Tailwind CSS, TanStack Query, Zustand, Express, PostgreSQL, Zod, Jest/Vitest.

---

## 总体节奏

- **第 0 阶段：质量基线确认**：0.5 天
- **Milestone 1：称谓解释 API 与测试保护**：2 天
- **Milestone 2：称谓卡片前端核心体验**：3 天
- **Milestone 3：手机端关系浏览重构**：4 天
- **Milestone 4：onboarding / 空状态产品化**：2 天
- **Milestone 5：家庭协作 UI 闭环**：4 天
- **Milestone 6：演示数据、验收与收尾**：2 天

建议周期：**2026-05-08 至 2026-06-05**，按 4 个工作周推进。每个里程碑独立可验收、可回滚。

---

## Week 1：核心称谓能力成型

### 第 0 阶段：质量基线确认

**目标：** 确保当前本地开发链路稳定，避免在不稳定基础上继续堆功能。

**任务：**

1. 确认数据库连接使用 `api/.env` 指向 `192.168.84.30:5432/family_tree`。
2. 跑 API 基线：

```bash
cd api
npm run typecheck
npm run build
npm test
```

3. 跑前端基线：

```bash
cd frontend
npm run build
```

**验收：**

- API typecheck/build/test 通过，或明确列出已有失败项。
- 前端 build 通过。
- `/health`、`/ready` 能连通 PostgreSQL。

---

### Milestone 1：称谓解释 API 与测试保护

**目标：** 后端提供稳定的“我和 TA 是什么关系 / 我该怎么称呼 TA”的结构化接口。

**范围：**

1. 补齐称谓规则单元测试。
2. 新增关系解释 DTO。
3. 新增接口：

```http
GET /api/v1/persons/:id/relationship-to?reference=<personId>
```

4. 返回字段：

```ts
interface RelationshipExplanation {
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

**建议任务拆分：**

- Task 1.1：补 `TitleCalculationService` / title rules 测试。
- Task 1.2：定义 `RelationshipExplanation` 类型。
- Task 1.3：实现 relationship-to service 方法。
- Task 1.4：挂载 person route。
- Task 1.5：写 API/service 测试。
- Task 1.6：跑 smoke test：创建 family/person/relationship 后调用 relationship-to。

**验收：**

- 覆盖父母、祖父母、外祖父母、叔伯姑舅姨、堂表亲、配偶亲属。
- 未知关系不报 500，返回 fallback。
- `npm run typecheck && npm run build && npm test` 通过。

---

## Week 2：前端核心产品体验

### Milestone 2：称谓卡片前端核心体验

**目标：** 用户点击任意亲戚时，第一屏看到“我该叫 TA 什么”。

**范围：**

1. 新增 `KinshipCard`。
2. 新增 `RelationshipPathView`。
3. 新增前端 query：`useRelationshipExplanation(targetPersonId, referencePersonId)`。
4. 接入 `PersonDetailPanel`。

**UI 要求：**

- 大号显示称谓：如「表姐」。
- 显示系别：父系 / 母系 / 姻亲 / 本人。
- 显示距离：如 `3 步关系`。
- 显示路径：`我 → 母亲 → 舅舅 → TA`。
- 显示反向称谓：`TA 叫你：表弟/表妹`。
- API 失败时 fallback，不白屏。

**建议任务拆分：**

- Task 2.1：新增前端类型 `RelationshipExplanation`。
- Task 2.2：实现 `RelationshipPathView`。
- Task 2.3：实现 `KinshipCard`。
- Task 2.4：新增 API query。
- Task 2.5：接入 `PersonDetailPanel` 顶部。
- Task 2.6：构建验证与手动浏览 smoke test。

**验收：**

- 亲戚详情第一屏出现称谓卡片。
- reference = target 时显示“本人”。
- API 返回 unknown/fallback 时 UI 仍可读。
- `cd frontend && npm run build` 通过。

---

### Milestone 3：手机端关系浏览重构

**目标：** 手机端不强依赖树图拖拽，而是以“中心人物 + 亲属分组列表”浏览。

**范围：**

1. 重构 `MobileTreeView`。
2. 新增 `RelativeGroupSection`。
3. 支持设为中心人物。
4. 每个亲戚行展示头像、姓名、称谓、简短关系。
5. 点击亲戚打开详情抽屉，并展示 `KinshipCard`。

**移动端信息架构：**

```text
顶部：当前中心人物 + 切换中心
核心卡：当前家庭 / 亲属数量 / 快捷操作
快捷添加：父亲、母亲、配偶、子女、兄弟姐妹
分组列表：
  - 父系亲属
  - 母系亲属
  - 配偶与姻亲
  - 子女后代
  - 兄弟姐妹
```

**验收：**

- 375px 宽度下无横向溢出。
- 手机端能完成：浏览亲属、点击查看称谓、切换中心人物。
- `cd frontend && npm run build` 通过。

---

## Week 3：产品化入口与协作闭环

### Milestone 4：onboarding / 空状态产品化

**目标：** 新用户第一次进入时知道为什么用、怎么开始。

**范围：**

1. `FamilyListPage` 空状态产品化。
2. `FamilyDashboard` 无 root person 时引导创建“我”。
3. 新增 `QuickStartChecklist`。
4. 创建 family 后引导添加中心人物。

**Checklist：**

```text
1. 创建家庭
2. 添加“我”
3. 添加父母
4. 添加一位你不知道怎么称呼的亲戚
5. 邀请家人补充
```

**验收：**

- 空状态不再像后台系统。
- 用户能顺着引导创建家庭和中心人物。
- `cd frontend && npm run build` 通过。

---

### Milestone 5：家庭协作 UI 闭环

**目标：** 后端已有协作基础，补齐前端入口，让家庭成员可被邀请加入。

**范围：**

1. 新增 `InviteFamilyDialog`。
2. 新增 `FamilyMembersPanel`。
3. `FamilyHeader` 增加“邀请家人”。
4. 前端接入成员列表、创建邀请、接受邀请、活动记录 API。
5. 基础角色展示：owner/editor/member/viewer。

**建议任务拆分：**

- Task 5.1：确认 collaboration API smoke test。
- Task 5.2：新增前端 types/query/mutation。
- Task 5.3：实现邀请弹窗。
- Task 5.4：实现成员面板。
- Task 5.5：接入 FamilyHeader。
- Task 5.6：补活动记录入口。

**验收：**

- 用户可生成邀请码/邀请链接。
- 可查看家庭成员列表。
- 可看到基础活动记录。
- `cd api && npm run typecheck && npm run build && npm test` 通过。
- `cd frontend && npm run build` 通过。

---

## Week 4：演示、验收、收尾

### Milestone 6：演示数据、验收与收尾

**目标：** 形成一条可演示的完整用户路径。

**演示路径：**

1. 打开首页，看见产品价值和 quick start。
2. 创建家庭。
3. 添加“我”。
4. 添加父母、舅舅/姨妈、表姐/表弟。
5. 点击表姐，看见称谓和关系路径。
6. 切换中心人物，称谓重新计算。
7. 手机宽度下浏览亲属分组。
8. 生成邀请链接。

**交付物：**

- demo seed 脚本或文档。
- smoke test 脚本。
- README 更新：开发启动、数据库配置、烟测命令。
- 产品验收清单。

**最终技术验收：**

```bash
cd api
npm run typecheck
npm run build
npm test

cd ../frontend
npm run build
```

**最终产品验收：**

- 点击亲戚第一屏展示中文称谓。
- 关系路径可读。
- 手机端可完成核心浏览。
- 空状态有产品引导。
- 可生成家庭邀请。
- 称谓失败有 fallback，不白屏。

---

## 明确不纳入本阶段

以下放到 V2，避免拖慢 MVP：

- AI 解析中文亲属描述。
- OCR 纸质族谱导入。
- 实时多人协同编辑。
- 复杂权限矩阵。
- 原生 App。
- 公开族谱库 / 寻亲网络。
- DNA / 基因相关能力。

---

## 风险与应对

### 风险 1：称谓规则复杂度超出预期

**应对：** 先覆盖最常见三代内亲属；复杂远亲返回 fallback + 可读路径。

### 风险 2：树图在手机上难用

**应对：** 手机端主体验改成分组列表，树图作为桌面增强视图。

### 风险 3：协作权限变复杂

**应对：** V1 只做展示角色和基础邀请；细粒度权限后置。

### 风险 4：测试数据污染远程数据库

**应对：** 所有 smoke test 使用固定前缀 `Smoke Test`，测试后先删 person 再删 family；必要时直接 SQL 清理。

---

## 下一步执行建议

马上开始 **Milestone 1：称谓解释 API 与测试保护**。

第一批任务：

1. 跑一次 API/前端基线。
2. 补称谓规则测试。
3. 设计并实现 `RelationshipExplanation`。
4. 实现 `/api/v1/persons/:id/relationship-to`。
5. 用真实 PostgreSQL 做一次 smoke test。

完成 Milestone 1 后，再进入前端 `KinshipCard`。