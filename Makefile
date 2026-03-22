.PHONY: help api-install api-dev api-build api-typecheck frontend-install frontend-dev frontend-build db-migrate db-clean-cache

help:
	@echo "可用命令:"
	@echo "  make api-install      - 安装 API 依赖"
	@echo "  make api-dev          - 启动 API 开发服务"
	@echo "  make api-build        - 构建 API"
	@echo "  make api-typecheck    - 检查 API 类型"
	@echo "  make frontend-install - 安装前端依赖"
	@echo "  make frontend-dev     - 启动前端开发服务"
	@echo "  make frontend-build   - 构建前端"
	@echo "  make db-migrate       - 执行 API 数据库初始化脚本"
	@echo "  make db-clean-cache   - 清理旧数据库缓存对象"

api-install:
	cd api && npm install

api-dev:
	cd api && npm run dev

api-build:
	cd api && npm run build

api-typecheck:
	cd api && npm run typecheck

frontend-install:
	cd frontend && npm install

frontend-dev:
	cd frontend && npm run dev

frontend-build:
	cd frontend && npm run build

db-migrate:
	cd api && node scripts/migrate.js

db-clean-cache:
	@echo "请执行: psql -f database/remove_cache_objects.sql"
