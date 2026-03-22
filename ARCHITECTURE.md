# 架构说明

## V1 目标
第一版只保留最小可运行架构：

```text
Frontend (React/Vite)
        |
        v
API (Express/TypeScript)
        |
        v
PostgreSQL
```

## 为什么收敛
- 先保证核心业务路径可维护、可验证、可上线
- 去掉 Redis、多级缓存、离线同步和数据库缓存对象，减少实现分叉
- 把 API 收敛到一套 PostgreSQL 服务链路，避免 Prisma/SQL 双实现并存

## 后端结构
### 路由层
- `api/routes/*.ts`
- 每个模块一个路由文件，`api/routes/index.ts` 只负责挂载

### 服务层
- `api/services/*Service.ts`
- 保留大写服务文件作为唯一实现
- 直接依赖 PostgreSQL，不再包缓存层

### 数据访问
- `api/config/database.ts`
- 提供连接池、普通查询、事务封装和健康检查

## 核心数据模型
- `families`
- `persons`
- `person_versions`
- `relationships`
- `relationship_versions`
- `life_events`

## 明确移除的内容
- Redis 客户端和健康检查
- 根目录 `cache/` 子系统
- Service Worker / IndexedDB 离线能力
- `person_side_cache`
- `get_side_cached`
- `invalidate_side_cache`
- `lineage_cache_temporal`
- `refresh_lineage_cache`

## 当前设计原则
- API 字段名统一使用 `snake_case`
- 导入任务状态只保存在内存
- 称谓和系别即时计算，不额外做缓存回填
- 文档以当前仓库实际状态为准，不再描述不存在的 `devops/` 目录
