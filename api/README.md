# API 服务

## 技术栈
- Node.js
- TypeScript
- Express
- PostgreSQL
- Zod

## V1 特点
- 不依赖 Redis
- 不依赖缓存层
- 不依赖 Prisma
- 统一使用 PostgreSQL + SQL 服务实现

## 运行
```bash
npm install
npm run typecheck
npm run build
npm run dev
```

## 主要端点
### 系统
- `GET /health`
- `GET /ready`
- `GET /live`

### 家族
- `GET /api/v1/families`
- `POST /api/v1/families`
- `GET /api/v1/families/:id`
- `PUT /api/v1/families/:id`
- `DELETE /api/v1/families/:id`
- `GET /api/v1/families/:id/tree`
- `GET /api/v1/families/:id/stats`
- `PUT /api/v1/families/:id/root`

### 人员
- `GET /api/v1/persons`
- `POST /api/v1/persons`
- `GET /api/v1/persons/:id`
- `PUT /api/v1/persons/:id`
- `DELETE /api/v1/persons/:id`
- `GET /api/v1/persons/:id/history`
- `GET /api/v1/persons/:id/parents`
- `GET /api/v1/persons/:id/children`
- `GET /api/v1/persons/:id/spouses`

### 关系
- `GET /api/v1/relationships`
- `POST /api/v1/relationships`
- `GET /api/v1/relationships/:id`
- `PUT /api/v1/relationships/:id`
- `DELETE /api/v1/relationships/:id`
- `GET /api/v1/relationships/:id/history`
- `POST /api/v1/relationships/check-cycle`
- `GET /api/v1/relationships/between`

### 称谓 / 系别 / 搜索 / 导入
- `GET /api/v1/calculate`
- `POST /api/v1/calculate/batch`
- `POST /api/v1/calculate/reverse`
- `GET /api/v1/sides/determine`
- `GET /api/v1/sides/path`
- `POST /api/v1/sides/batch`
- `GET /api/v1/sides/ancestor`
- `GET /api/v1/search`
- `GET /api/v1/search/suggestions`
- `POST /api/v1/search/advanced`
- `POST /api/v1/search/reindex`
- `POST /api/v1/import`
- `GET /api/v1/import/template`
- `POST /api/v1/import/validate`
- `GET /api/v1/import/:jobId`
- `POST /api/v1/import/:jobId/cancel`

## 环境变量
见 `api/.env.example`。
