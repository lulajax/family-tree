# 项目总结

## 当前仓库状态
- 已收敛为 `frontend + api + database` 三部分
- 已移除 Redis、离线同步、多级缓存和缓存示例代码
- API 已统一到 PostgreSQL 大写服务链路

## API 模块
- `FamilyService`
- `PersonService`
- `RelationshipService`
- `CycleDetectionService`
- `SideCalculationService`
- `TitleCalculationService`
- `SearchService`
- `ImportService`

## 数据库模块
- `database/schema.sql`
  - 简化版初始化脚本
  - 只保留 v1 核心表与更新时间触发器
- `database/remove_cache_objects.sql`
  - 用于旧库清理缓存相关对象

## 前端模块
- 保留 React/Vite 应用入口和页面代码
- 移除了 `Service Worker` 注册逻辑

## V1 架构取舍
- 保留：核心 CRUD、搜索、称谓、系别、导入
- 去掉：Redis、缓存失效、离线优先、预计算缓存视图
- 目标：降低复杂度，先保证主链路稳定

## 当前开发验收
- `api` 需要通过 `npm run typecheck`
- `api` 需要通过 `npm run build`
- `frontend` 需要通过 `npm run build`
