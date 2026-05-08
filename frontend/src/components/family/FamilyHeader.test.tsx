import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FamilyHeader } from './FamilyHeader';

const family = {
  id: 'family-1',
  name: '陆氏家族',
  description: null,
  root_person_id: null,
  generation_name: null,
  hall_name: '三槐堂',
  created_at: '2026-05-08T00:00:00Z',
  updated_at: '2026-05-08T00:00:00Z',
  member_count: 12,
};

describe('FamilyHeader', () => {
  it('renders collaboration actions when callbacks are provided', () => {
    const html = renderToStaticMarkup(
      <FamilyHeader family={family} onInviteClick={vi.fn()} onMembersClick={vi.fn()} />
    );

    expect(html).toContain('陆氏家族');
    expect(html).toContain('邀请家人');
    expect(html).toContain('成员与活动');
  });
});
