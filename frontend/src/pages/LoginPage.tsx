import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLogin, useRegister } from '../api/mutations';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();
  const register = useRegister();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === 'login') {
        await login.mutateAsync({ username, password });
      } else {
        await register.mutateAsync({ username, password, display_name: displayName || undefined });
      }
      navigate('/');
    } catch {
      // error handled by mutation
    }
  };

  const error = mode === 'login' ? login.error : register.error;
  const isPending = mode === 'login' ? login.isPending : register.isPending;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-sm mx-4">
        <h1 className="text-2xl font-bold text-gray-800 text-center mb-6">
          {mode === 'login' ? '登录' : '注册'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">显示名称（可选）</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600">{error.message}</div>
          )}

          <button
            type="submit"
            disabled={isPending || !username || !password}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {isPending ? '处理中...' : mode === 'login' ? '登录' : '注册'}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-500">
          {mode === 'login' ? (
            <>
              没有账号？{' '}
              <button onClick={() => setMode('register')} className="text-blue-600 hover:underline">
                注册
              </button>
            </>
          ) : (
            <>
              已有账号？{' '}
              <button onClick={() => setMode('login')} className="text-blue-600 hover:underline">
                登录
              </button>
            </>
          )}
        </div>

        <div className="mt-4 text-center">
          <Link to="/" className="text-sm text-gray-400 hover:text-gray-600">
            跳过登录
          </Link>
        </div>
      </div>
    </div>
  );
}
