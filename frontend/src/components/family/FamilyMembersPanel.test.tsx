import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FamilyMembersPanel } from './FamilyMembersPanel';

describe('FamilyMembersPanel', () => {
  it('renders members with role labels and recent activity', () => {
    const html = renderToStaticMarkup(
      <FamilyMembersPanel
        members={[
          { id: 'm1', family_id: 'f1', user_id: 'u1', role: 'owner', joined_at: '2026-05-08T00:00:00Z' },
          { id: 'm2', family_id: 'f1', user_id: 'u2', role: 'viewer', joined_at: '2026-05-08T00:00:00Z' },
        ]}
        activity={[
          {
            id: 'a1',
            family_id: 'f1',
            actor_user_id: 'u1',
            action: 'create_invite',
            entity_type: 'family_invite',
            entity_id: 'invite-1',
            before: null,
            after: null,
            created_at: '2026-05-08T00:00:00Z',
          },
        ]}
      />
    );

    expect(html).toContain('家庭成员');
    expect(html).toContain('拥有者');
    expect(html).toContain('仅查看');
    expect(html).toContain('最近活动');
    expect(html).toContain('创建邀请');
  });
});
