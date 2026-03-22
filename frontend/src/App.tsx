import { useEffect, useState } from 'react';

type EndpointKey = 'health' | 'ready' | 'live';

type EndpointState = {
  code?: number;
  body?: string;
  fetchedAt?: string;
  message?: string;
  status: 'idle' | 'loading' | 'success' | 'error';
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '');

const endpoints: Array<{
  description: string;
  key: EndpointKey;
  path: string;
  title: string;
}> = [
  {
    key: 'health',
    title: '/health',
    path: '/health',
    description: '检查 API 与 PostgreSQL 的整体连通状态。',
  },
  {
    key: 'ready',
    title: '/ready',
    path: '/ready',
    description: '确认服务已具备对外提供请求的条件。',
  },
  {
    key: 'live',
    title: '/live',
    path: '/live',
    description: '最轻量的进程存活探针。',
  },
];

const architecture = [
  {
    title: 'Frontend',
    description: 'React + Vite 的最小可运行界面，负责联调、说明和基础验证。',
  },
  {
    title: 'Express API',
    description: '统一走 PostgreSQL 链路，不再保留 Redis、NodeCache 或多级缓存逻辑。',
  },
  {
    title: 'PostgreSQL',
    description: '家族、人物、关系与版本记录的唯一持久化来源。',
  },
];

const removed = [
  'Redis 连接、健康检查和优雅关闭逻辑',
  '根目录 cache 子系统与多级缓存实现',
  'Service Worker / 离线缓存入口',
  '数据库中的缓存表、缓存函数与物化缓存视图',
];

function stringifyPayload(body?: string): string {
  if (!body) {
    return '暂无返回内容';
  }

  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

function formatTimestamp(value?: string): string {
  if (!value) {
    return '未拉取';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    second: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

export default function App() {
  const [statusMap, setStatusMap] = useState<Record<EndpointKey, EndpointState>>({
    health: { status: 'idle' },
    ready: { status: 'idle' },
    live: { status: 'idle' },
  });

  const refreshEndpoint = async (key: EndpointKey, path: string) => {
    setStatusMap((current) => ({
      ...current,
      [key]: {
        ...current[key],
        message: undefined,
        status: 'loading',
      },
    }));

    try {
      const response = await fetch(`${API_BASE_URL}${path}`);
      const body = await response.text();

      setStatusMap((current) => ({
        ...current,
        [key]: {
          body,
          code: response.status,
          fetchedAt: new Date().toISOString(),
          status: response.ok ? 'success' : 'error',
        },
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : '请求失败';

      setStatusMap((current) => ({
        ...current,
        [key]: {
          code: 0,
          fetchedAt: new Date().toISOString(),
          message,
          status: 'error',
        },
      }));
    }
  };

  useEffect(() => {
    endpoints.forEach((endpoint) => {
      void refreshEndpoint(endpoint.key, endpoint.path);
    });
  }, []);

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10 lg:px-10">
        <section className="relative overflow-hidden rounded-[2rem] border border-amber-200/20 bg-gradient-to-br from-stone-900 via-stone-900 to-amber-950/80 px-8 py-10 shadow-2xl shadow-amber-950/20">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />
          <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
            <div className="space-y-6">
              <p className="text-sm uppercase tracking-[0.35em] text-amber-200/80">
                Family Tree V1
              </p>
              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-stone-50 md:text-5xl">
                  现在只保留一条清晰链路: Frontend + Express API + PostgreSQL
                </h1>
                <p className="max-w-2xl text-base leading-7 text-stone-300">
                  这一版聚焦在稳定、可维护和可上线的最小架构。Redis、离线缓存、多级缓存和数据库缓存对象都已经从正式链路中移除。
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-stone-200">
                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2">
                  API Base URL: {API_BASE_URL}
                </span>
                <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2">
                  Service Worker: Disabled
                </span>
                <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-2">
                  Cache Layer: Removed
                </span>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-stone-200/10 bg-black/20 p-6 backdrop-blur">
              <p className="text-sm uppercase tracking-[0.25em] text-stone-400">Release Notes</p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-stone-200">
                {removed.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-2 w-2 rounded-full bg-amber-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {architecture.map((item) => (
            <article
              key={item.title}
              className="rounded-[1.5rem] border border-stone-800 bg-stone-900/70 p-6 shadow-lg shadow-black/20"
            >
              <p className="text-xs uppercase tracking-[0.3em] text-stone-500">{item.title}</p>
              <p className="mt-4 text-base leading-7 text-stone-200">{item.description}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-[2rem] border border-stone-800 bg-stone-900/70 p-6 md:p-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-stone-500">Runtime Checks</p>
              <h2 className="mt-3 text-2xl font-semibold text-stone-50">接口探针</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-400">
                页面加载后会自动请求 `/health`、`/ready`、`/live`。如果本地后端还没启动，这里会直接显示失败原因，方便联调。
              </p>
            </div>
            <button
              className="rounded-full border border-amber-300/40 bg-amber-300/10 px-5 py-2 text-sm font-medium text-amber-100 transition hover:border-amber-200/60 hover:bg-amber-300/20"
              onClick={() => {
                endpoints.forEach((endpoint) => {
                  void refreshEndpoint(endpoint.key, endpoint.path);
                });
              }}
              type="button"
            >
              重新检测
            </button>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {endpoints.map((endpoint) => {
              const state = statusMap[endpoint.key];
              const tone =
                state.status === 'success'
                  ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
                  : state.status === 'error'
                    ? 'border-rose-400/30 bg-rose-400/10 text-rose-100'
                    : 'border-stone-700 bg-stone-950/60 text-stone-200';

              return (
                <article
                  key={endpoint.key}
                  className={`rounded-[1.5rem] border p-5 transition ${tone}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] opacity-70">{endpoint.title}</p>
                      <p className="mt-3 text-sm leading-6 opacity-90">{endpoint.description}</p>
                    </div>
                    <button
                      className="rounded-full border border-current/20 px-3 py-1 text-xs font-medium"
                      onClick={() => {
                        void refreshEndpoint(endpoint.key, endpoint.path);
                      }}
                      type="button"
                    >
                      刷新
                    </button>
                  </div>

                  <div className="mt-5 flex items-center justify-between text-sm">
                    <span>
                      状态:
                      {' '}
                      {state.status === 'loading'
                        ? '加载中'
                        : state.status === 'success'
                          ? '正常'
                          : state.status === 'error'
                            ? '异常'
                            : '未请求'}
                    </span>
                    <span>HTTP {state.code ?? '-'}</span>
                  </div>

                  <p className="mt-2 text-xs opacity-70">更新时间: {formatTimestamp(state.fetchedAt)}</p>

                  <pre className="mt-4 overflow-x-auto rounded-2xl bg-black/25 p-4 text-xs leading-6 text-stone-100">
                    {state.message ?? stringifyPayload(state.body)}
                  </pre>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
