import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { InviteFamilyDialog } from './InviteFamilyDialog';

describe('InviteFamilyDialog', () => {
  it('renders role choices and generated invite link', () => {
    const html = renderToStaticMarkup(
      <InviteFamilyDialog
        familyId="family-1"
        inviteCode="abc123"
        isCreating={false}
        onCreateInvite={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(html).toContain('邀请家人');
    expect(html).toContain('可编辑');
    expect(html).toContain('成员');
    expect(html).toContain('仅查看');
    expect(html).toContain('abc123');
    expect(html).toContain('/invite/abc123');
  });
});
