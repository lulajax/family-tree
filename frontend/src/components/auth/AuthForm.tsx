import { useState } from 'react';

export type AuthFormMode = 'login' | 'register';

export interface AuthFormSubmitPayload {
  username: string;
  password: string;
  display_name?: string;
}

interface AuthFormProps {
  mode: AuthFormMode;
  isPending: boolean;
  errorMessage?: string;
  onModeChange: (mode: AuthFormMode) => void;
  onSubmit: (payload: AuthFormSubmitPayload) => void | Promise<void>;
}

export function AuthForm({ mode, isPending, errorMessage, onModeChange, onSubmit }: AuthFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const isRegister = mode === 'register';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      username,
      password,
      display_name: isRegister && displayName ? displayName : undefined,
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-sm mx-4">
      <h1 className="text-2xl font-bold text-gray-800 text-center mb-2">
        {isRegister ? '创建账号' : '登录 family-tree'}
      </h1>
      <p className="text-sm text-gray-500 text-center mb-6">
        {isRegister ? '创建账号后即可建立家庭空间' : '登录后继续管理你的家庭关系图谱'}
      </p>

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

        {isRegister && (
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

        {errorMessage && <div className="text-sm text-red-600">{errorMessage}</div>}

        <button
          type="submit"
          disabled={isPending || !username || !password}
          className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {isPending ? '处理中...' : isRegister ? '注册' : '登录'}
        </button>
      </form>

      <div className="mt-4 text-center text-sm text-gray-500">
        {isRegister ? (
          <>
            已有账号？{' '}
            <button onClick={() => onModeChange('login')} className="text-blue-600 hover:underline">
              登录
            </button>
          </>
        ) : (
          <>
            没有账号？{' '}
            <button onClick={() => onModeChange('register')} className="text-blue-600 hover:underline">
              注册
            </button>
          </>
        )}
      </div>
    </div>
  );
}
