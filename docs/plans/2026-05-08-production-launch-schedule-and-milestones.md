# family-tree 上线产品化排期与里程碑

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task. Use strict TDD for backend auth/permission/data-safety logic and run full API/frontend gates before every commit.

**Goal:** 把当前可演示的中文家庭关系图谱 MVP 推进到可上线给真实家庭使用的产品版本。

**Architecture:** 延续 React/Vite + Express/TypeScript + PostgreSQL。上线版本优先补齐身份认证、家庭权限、邀请接受闭环、数据安全、演示/部署/验收；不引入 Redis、实时协同、AI/OCR、原生 App 等 V2 能力。

**Tech Stack:** React 18, Vite, TypeScript, Tailwind CSS, TanStack Query, Zustand, Express, PostgreSQL, Zod, Jest/Vitest, 1Panel/PostgreSQL on `192.168.84.30`.

---

## 产品定位

**一句话：** 给中文家庭用的现代亲属关系地图：帮年轻人看懂亲戚关系、知道怎么称呼，并和家人一起安全补全家庭记忆。

**核心差异化：**
1. 中文称谓优先：第一屏回答“我该怎么叫 TA”。
2. 双系家庭图谱：父系、母系、姻亲同等重要。
3. 手机端优先：适配微信/H5 场景。
4. 家庭协作：邀请家人加入、按角色编辑、留痕。
5. 家庭记忆沉淀：人物资料、照片、故事、来源可追溯。

**上线 MVP 用户故事：**
- 用户能注册/登录，并拥有自己的家庭空间。
- 用户创建家庭后自动成为 owner。
- owner/editor 可以添加/编辑人物与关系；viewer 只读。
- 用户可以生成邀请链接，受邀者打开链接后登录/注册并加入家庭。
- 用户点击亲戚能看到称谓、关系路径、父系/母系/姻亲归属。
- 用户能看到基础活动记录，知道谁邀请/加入/修改了什么。
- 运维能备份数据库，产品能一键跑 smoke/demo 验收。

**本阶段明确不做：**
- AI 解析中文亲属描述。
- OCR/族谱扫描导入。
- 实时多人协同编辑。
- 复杂权限矩阵/审批流。
- 原生 App。
- 公开族谱库/寻亲网络/DNA 能力。

---

## 排期总览

当前日期：2026-05-08。建议上线产品化周期：**2026-05-08 至 2026-06-19**，6 周，按可回滚里程碑推进。

| 周期 | 里程碑 | 目标 |
| --- | --- | --- |
| Week 1 | M7 身份认证与生产安全基线 | 登录、JWT、生产配置、family owner 自动创建 |
| Week 2 | M8 家庭权限控制 | family membership 权限贯穿 API，viewer 只读 |
| Week 3 | M9 邀请接受闭环 | `/invite/:code` 页面、注册/登录后加入家庭 |
| Week 4 | M10 家庭记忆资料 | 人物头像/故事/事件/资料来源的 V1 体验 |
| Week 5 | M11 数据安全与运维 | 备份、恢复演练、删除保护、部署文档 |
| Week 6 | M12 上线验收与演示包 | demo seed、E2E smoke、README、验收清单 |

---

## M7：身份认证与生产安全基线

**目标：** 上线环境不允许匿名写入；用户创建家庭后自动成为 owner。

**范围：**
1. 生产环境必须配置 `JWT_SECRET`，不能静默跳过认证。
2. 前端登录/注册页面与 token 持久化。
3. `GET /auth/me` 与前端用户态。
4. 创建 family 时当前用户自动写入 `family_memberships(owner)`。
5. 本地 smoke 仍可通过显式 dev 配置运行。

**任务拆分：**

### Task 7.1：认证中间件生产安全测试

**Objective:** 防止生产环境因为缺少 `JWT_SECRET` 而跳过认证。

**Files:**
- Modify: `api/middleware/auth.ts`
- Test: `api/middleware/auth.test.ts`

**Steps:**
1. 写 failing test：`NODE_ENV=production` 且无 `JWT_SECRET` 时，`authenticateToken` 返回配置错误/Unauthorized，而不是 `next()`。
2. Run: `cd api && npm test -- middleware/auth.test.ts --runInBand`
3. 实现最小逻辑：仅在非 production 且无 JWT_SECRET 时跳过认证。
4. 重新运行 targeted test。
5. Run: `npm run typecheck && npm test`。
6. Commit: `fix(api): require jwt secret in production`。

### Task 7.2：Auth 前端数据层

**Objective:** 前端可以 register/login/me/logout，并统一保存/清除 token。

**Files:**
- Create: `frontend/src/api/auth.ts`
- Create: `frontend/src/api/auth.test.ts`
- Modify: `frontend/src/api/client.ts` 如需封装 token helper。

**Acceptance:**
- login/register 成功后保存 `auth_token`。
- logout 清除 token。
- 401 时可被上层识别。
- `cd frontend && npm test -- --run src/api/auth.test.ts && npm run build` 通过。

### Task 7.3：登录/注册 UI 与用户态

**Objective:** 用户可通过 UI 登录/注册，Header 显示当前用户。

**Files:**
- Create: `frontend/src/pages/AuthPage.tsx`
- Create: `frontend/src/components/auth/AuthForm.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/layout/*` 或现有 Header。

**Acceptance:**
- 未登录时可进入登录/注册。
- 登录后 token 生效并跳回家庭列表。
- 刷新后通过 `/auth/me` 恢复用户态。

### Task 7.4：创建家庭自动成为 owner

**Objective:** family 创建者自动获得 owner membership。

**Files:**
- Modify: `api/services/FamilyService.ts`
- Modify: `api/routes/familyRoutes.ts`
- Test: `api/services/FamilyService.test.ts` 或 route test。

**Acceptance:**
- 带 token 创建 family 后，`family_memberships` 有 owner。
- 无登录在 production-like auth 下不能创建 family。
- Real DB smoke 覆盖 register -> create family -> list collaboration members。

---

## M8：家庭权限控制

**目标：** API 层真正按 family membership 限制访问和写入。

**角色规则 V1：**
- owner：管理家庭、邀请成员、删除家庭、编辑所有资料。
- editor：添加/编辑人物与关系。
- member：查看、补充非结构化资料；V1 可暂按 viewer+comment 预留。
- viewer：只读。

**任务拆分：**
1. Task 8.1：新增 `FamilyAccessService`：`getRole(userId, familyId)` / `canRead` / `canEdit` / `canManage`。
2. Task 8.2：新增 `requireFamilyRole(familyIdParam, roles)` middleware。
3. Task 8.3：保护 family/person/relationship 写接口。
4. Task 8.4：保护 invite 创建/成员列表/activity 查询。
5. Task 8.5：权限失败 UI：viewer 隐藏编辑按钮，403 展示友好提示。
6. Task 8.6：真实数据库权限 smoke：owner 可写、viewer 不能写。

**验收：**
- 未登录不能访问私有 family。
- 非成员不能读取 family。
- viewer 不能新增/编辑/删除。
- owner/editor 可编辑。
- `cd api && npm run typecheck && npm run build && npm test` 通过。
- `cd frontend && npm test -- --run && npm run build` 通过。

---

## M9：邀请接受闭环

**目标：** 邀请链接从生成到受邀者加入家庭完整可用。

**任务拆分：**
1. Task 9.1：新增 `GET /invites/:code` 返回家庭名、角色、过期/已使用状态。
2. Task 9.2：支持邀请撤销/过期状态 UI。
3. Task 9.3：新增前端 `/invite/:code` 页面。
4. Task 9.4：未登录访问邀请页时引导登录/注册，登录后继续接受。
5. Task 9.5：接受邀请后跳转对应 FamilyDashboard。
6. Task 9.6：邀请 smoke：owner 创建 invite -> 新用户打开 -> 接受 -> 成为成员。

**验收：**
- 邀请链接可复制给另一个用户。
- 过期/已使用/无效邀请码有清晰提示。
- 成功加入后 family 列表可见该家庭。

---

## M10：家庭记忆资料 V1

**目标：** 人物详情从“节点信息”升级为“家庭记忆卡”。

**范围：**
- 头像/照片入口（先复用已有 upload 能力）。
- life events 前端编辑入口。
- 故事/备注/资料来源字段展示。
- 人物详情时间线。

**任务拆分：**
1. Task 10.1：梳理已有 `life_events` API，补测试。
2. Task 10.2：新增 `LifeEventTimeline` 组件。
3. Task 10.3：新增 `EditLifeEventDialog`。
4. Task 10.4：人物详情接入故事/来源展示。
5. Task 10.5：头像上传与默认头像优化。

**验收：**
- 用户能给人物添加“出生/结婚/迁居/去世/故事”事件。
- 人物详情可读且移动端不溢出。

---

## M11：数据安全与运维

**目标：** 上线后可备份、可恢复、可排障。

**任务拆分：**
1. Task 11.1：数据库备份脚本：`scripts/backup-db.sh`，优先复用 192.168.84.30 现有 PostgreSQL。
2. Task 11.2：恢复演练文档：`docs/ops/restore-postgres.md`。
3. Task 11.3：危险删除二次确认：family/person delete UI。
4. Task 11.4：生产 `.env.example` 与 1Panel 部署说明。
5. Task 11.5：健康检查/ready 检查文档化。

**验收：**
- 能生成备份文件。
- README 写明恢复步骤。
- 删除家庭必须输入家庭名确认。

---

## M12：上线验收与演示包

**目标：** 形成可重复演示、可自动验收的上线候选版本。

**任务拆分：**
1. Task 12.1：提交 demo seed 脚本：`scripts/seed-demo-family.ts`。
2. Task 12.2：提交 API smoke：注册、创建家庭、建关系、称谓、邀请、权限。
3. Task 12.3：提交前端手动验收 checklist。
4. Task 12.4：更新根 README：本地启动、数据库、测试、部署。
5. Task 12.5：最终 release candidate 验证。

**最终技术验收：**
```bash
cd api
npm run typecheck
npm run build
npm test

cd ../frontend
npm test -- --run
npm run build
```

**最终产品验收：**
- 注册/登录可用。
- 创建家庭自动成为 owner。
- 添加“我/父母/姨妈/表姐”后能显示称谓与路径。
- 手机端可浏览分组。
- 邀请链接可被新用户接受。
- viewer 不能编辑。
- 活动记录能看到邀请/加入/修改。
- 生产环境不会因缺少 JWT_SECRET 静默跳过认证。
- README 能让新开发者跑通项目。

---

## 风险与应对

1. **权限改造影响现有 smoke/test。** 先在 dev/test 允许显式 mock user，逐步保护写接口；每个 endpoint 做 targeted test。
2. **生产安全与本地开发冲突。** 只允许非 production 且无 JWT_SECRET 时跳过认证；README 明确生产必须配置。
3. **邀请接受页涉及登录态跳转复杂。** 先实现 token localStorage + redirect param，暂不做 OAuth/微信登录。
4. **远程数据库测试污染。** smoke 使用 `Smoke Test` 前缀，finally 清理 family；必要时 SQL 清理。
5. **范围膨胀。** AI/OCR/实时协同/公开族谱全部后置。

---

## 立即执行

从 **Task 7.1：认证中间件生产安全测试** 开始。该任务不涉及产品方向选择，属于上线安全底线，按 TDD 执行并单独提交。
