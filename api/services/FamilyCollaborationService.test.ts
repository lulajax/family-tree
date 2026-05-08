import { FamilyCollaborationService } from './FamilyCollaborationService';
import { query } from '../config/database';

jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

const queryMock = query as jest.MockedFunction<typeof query>;

describe('FamilyCollaborationService', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('creates member invites with a generated invite code and audit log', async () => {
    queryMock
      .mockResolvedValueOnce({
        rows: [{
          id: 'invite-1',
          family_id: 'family-1',
          invite_code: 'abc123',
          role: 'member',
          expires_at: null,
          created_by: 'user-1',
          created_at: new Date('2026-05-07T00:00:00Z'),
          accepted_by: null,
          accepted_at: null,
        }],
        rowCount: 1,
      } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    const service = new FamilyCollaborationService(() => 'abc123');
    const invite = await service.createInvite('family-1', 'user-1', { role: 'member' });

    expect(invite.invite_code).toBe('abc123');
    expect(invite.role).toBe('member');
    expect(queryMock).toHaveBeenNthCalledWith(1, expect.stringContaining('INSERT INTO family_invites'), [
      'family-1',
      'abc123',
      'member',
      null,
      'user-1',
    ]);
    expect(queryMock).toHaveBeenNthCalledWith(2, expect.stringContaining('INSERT INTO audit_logs'), [
      'family-1',
      'user-1',
      'create_invite',
      'family_invite',
      'invite-1',
      null,
      expect.objectContaining({ role: 'member' }),
    ]);
  });

  it('accepts an invite by adding a family membership and marking invite accepted', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ id: 'invite-1', family_id: 'family-1', role: 'member', accepted_at: null, expires_at: null }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ id: 'membership-1', family_id: 'family-1', user_id: 'user-2', role: 'member' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    const service = new FamilyCollaborationService(() => 'unused');
    const membership = await service.acceptInvite('invite-code', 'user-2');

    expect(membership).toMatchObject({ family_id: 'family-1', user_id: 'user-2', role: 'member' });
    expect(queryMock).toHaveBeenNthCalledWith(2, expect.stringContaining('INSERT INTO family_memberships'), [
      'family-1',
      'user-2',
      'member',
      null,
    ]);
    expect(queryMock).toHaveBeenNthCalledWith(4, expect.stringContaining('INSERT INTO audit_logs'), [
      'family-1',
      'user-2',
      'accept_invite',
      'family_membership',
      'membership-1',
      null,
      expect.objectContaining({ role: 'member', invite_id: 'invite-1' }),
    ]);
  });
});
