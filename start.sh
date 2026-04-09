#!/bin/bash
# ============================================
# 双系族谱系统 - 一键启动脚本
# ============================================

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
API_DIR="$PROJECT_DIR/api"
FRONTEND_DIR="$PROJECT_DIR/frontend"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

API_PID=""
FRONTEND_PID=""

cleanup() {
    echo ""
    echo -e "${YELLOW}正在停止服务...${NC}"
    [ -n "$API_PID" ] && kill "$API_PID" 2>/dev/null && echo -e "${GREEN}API 服务已停止${NC}"
    [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null && echo -e "${GREEN}前端服务已停止${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  双系族谱系统 - 启动中...${NC}"
echo -e "${GREEN}========================================${NC}"

# 检查 Node.js
if ! command -v node &>/dev/null; then
    echo -e "${RED}错误: 未找到 Node.js，请先安装 Node.js >= 18${NC}"
    exit 1
fi

# 检查 .env
if [ ! -f "$API_DIR/.env" ]; then
    echo -e "${YELLOW}未找到 api/.env，从 .env.example 复制...${NC}"
    cp "$API_DIR/.env.example" "$API_DIR/.env"
    echo -e "${YELLOW}请编辑 api/.env 配置数据库等参数${NC}"
fi

# 安装依赖（如需要）
if [ ! -d "$API_DIR/node_modules" ]; then
    echo -e "${YELLOW}安装 API 依赖...${NC}"
    (cd "$API_DIR" && npm install)
fi

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo -e "${YELLOW}安装前端依赖...${NC}"
    (cd "$FRONTEND_DIR" && npm install)
fi

# 启动 API
echo -e "${GREEN}启动 API 服务...${NC}"
(cd "$API_DIR" && npm run dev) &
API_PID=$!

# 启动前端
echo -e "${GREEN}启动前端服务...${NC}"
(cd "$FRONTEND_DIR" && npm run dev) &
FRONTEND_PID=$!

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  服务已启动:${NC}"
echo -e "${GREEN}  API:    http://localhost:3000${NC}"
echo -e "${GREEN}  前端:   http://localhost:5173${NC}"
echo -e "${GREEN}  按 Ctrl+C 停止所有服务${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

wait
