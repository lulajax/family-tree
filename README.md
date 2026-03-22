# 双系族谱系统

**版本**: v1 Simplified  
**日期**: 2026-03-21  
**架构**: React Frontend + Express API + PostgreSQL

## 概览
- 这是一个收敛后的第一版实现，目标是先把核心家族、人员、关系、称谓、系别、搜索、批量导入跑通。
- 运行时不再依赖 Redis、多级缓存、离线同步或物化缓存视图。
- 后端统一使用 PostgreSQL 路径的大写服务文件，移除了重复的 Prisma/缓存实现。

## 当前目录
```text
.
├── api/          # Express + TypeScript API
├── database/     # PostgreSQL schema 和辅助脚本
├── frontend/     # Vite + React 前端
├── ARCHITECTURE.md
├── Makefile
├── PROJECT_SUMMARY.md
└── README.md
```

## 核心能力
- 家族 CRUD 与根节点设置
- 人员 CRUD、父母/子女/配偶查询、历史版本
- 关系 CRUD、循环检测、关系历史
- 称谓计算与反向称谓
- 系别判定、共同祖先、关系路径
- 全文搜索与高级搜索
- CSV 批量导入、任务查询与取消

## 开发方式
### 1. 初始化数据库
```bash
cd api
node scripts/migrate.js
```

或使用完整 schema：

```bash
psql -U postgres -d genealogy_db -f database/schema.sql
```

### 2. 启动 API
```bash
cd api
npm install
npm run dev
```

### 3. 启动前端
```bash
cd frontend
npm install
npm run dev
```

## 环境变量
`api/.env.example` 里保留了 v1 需要的变量：
- `PORT`
- `API_PREFIX`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_MAX_CONNECTIONS`
- `DB_SSL`

## 健康检查
- `GET /health`: 仅检查 PostgreSQL
- `GET /ready`: 仅检查 PostgreSQL 是否就绪
- `GET /live`: 进程存活

## 数据库说明
- `database/schema.sql`: 新的简化版初始化脚本
- `database/remove_cache_objects.sql`: 用于清理旧环境里的缓存相关对象

## 说明
- 前端不再注册 `Service Worker`
- 导入任务状态只保存在 API 进程内，重启后不会保留
- 旧的 Redis、离线同步、多级缓存和物化缓存设计已从运行架构中移除
