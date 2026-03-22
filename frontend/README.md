# 双系族谱系统前端

前端已收敛为 V1 最小界面，职责是：

- 展示当前简化后的系统架构
- 直接探测 `/health`、`/ready`、`/live`
- 作为联调和部署验收的轻量入口

## 当前架构

- `React 18`
- `TypeScript`
- `Vite`
- `Tailwind CSS`

V1 不再保留以下能力：

- `Service Worker`
- 离线缓存 / PWA
- 前端多级缓存
- 旧版复杂树图与移动端实验组件的正式编译链路

## 环境变量

```bash
VITE_API_BASE_URL=/api
```

## 开发

```bash
npm install
npm run dev
```

默认启动后访问 `http://localhost:3000`。

## 构建

```bash
npm run build
npm run preview
```

## 页面内容

首页会展示：

- V1 架构说明
- 已移除能力清单
- `/health`、`/ready`、`/live` 的实时探针结果

如果后端未启动，页面会直接显示请求失败原因，方便联调定位。
