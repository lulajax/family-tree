import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLogin, useRegister } from '../api/mutations';
import { AuthForm, type AuthFormSubmitPayload, type AuthFormMode } from '../components/auth/AuthForm';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const login = useLogin();
  const register = useRegister();

  const [mode, setMode] = useState<AuthFormMode>('login');

  const handleSubmit = async (payload: AuthFormSubmitPayload) => {
    try {
      if (mode === 'login') {
        await login.mutateAsync({ username: payload.username, password: payload.password });
      } else {
        await register.mutateAsync(payload);
      }
      navigate(searchParams.get('redirect') || '/');
    } catch {
      // error handled by mutation state
    }
  };

  const error = mode === 'login' ? login.error : register.error;
  const isPending = mode === 'login' ? login.isPending : register.isPending;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center bg-gray-50">
      <AuthForm
        mode={mode}
        isPending={isPending}
        errorMessage={error?.message}
        onModeChange={setMode}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
