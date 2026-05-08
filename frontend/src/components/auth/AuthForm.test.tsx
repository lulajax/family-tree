import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuthForm } from './AuthForm';

describe('AuthForm', () => {
  it('renders login copy and submit state', () => {
    const html = renderToStaticMarkup(
      <AuthForm
        mode="login"
        isPending={false}
        onModeChange={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(html).toContain('登录 family-tree');
    expect(html).toContain('用户名');
    expect(html).toContain('密码');
    expect(html).toContain('没有账号');
  });

  it('renders registration display name field', () => {
    const html = renderToStaticMarkup(
      <AuthForm
        mode="register"
        isPending={false}
        onModeChange={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(html).toContain('创建账号');
    expect(html).toContain('显示名称');
    expect(html).toContain('已有账号');
  });
});
