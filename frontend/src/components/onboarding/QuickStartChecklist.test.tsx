import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { QuickStartChecklist } from './QuickStartChecklist';

describe('QuickStartChecklist', () => {
  it('renders the five product onboarding steps', () => {
    const html = renderToStaticMarkup(<QuickStartChecklist />);

    expect(html).toContain('创建家庭');
    expect(html).toContain('添加“我”');
    expect(html).toContain('添加父母');
    expect(html).toContain('添加一位你不知道怎么称呼的亲戚');
    expect(html).toContain('邀请家人补充');
  });
});
