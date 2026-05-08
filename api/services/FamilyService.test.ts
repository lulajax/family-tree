import { FamilyService } from './FamilyService';
import { withTransaction } from '../config/database';

jest.mock('../config/database', () => ({
  query: jest.fn(),
  withTransaction: jest.fn(),
}));

const withTransactionMock = withTransaction as jest.MockedFunction<typeof withTransaction>;

describe('FamilyService', () => {
  beforeEach(() => {
    withTransactionMock.mockReset();
  });

  it('adds the creating user as family owner when a logged-in user creates a family', async () => {
    const family = {
      id: 'family-1',
      name: '上线测试家族',
      description: null,
      root_person_id: null,
      generation_name: null,
      hall_name: null,
      created_at: new Date('2026-05-08T00:00:00Z'),
      updated_at: new Date('2026-05-08T00:00:00Z'),
      created_by: 'user-1',
    };
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: [family], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 'membership-1' }], rowCount: 1 }),
    };
    withTransactionMock.mockImplementationOnce(async (callback) => callback(client as never));

    const result = await new FamilyService().createFamily(
      '上线测试家族',
      undefined,
      undefined,
      'user-1'
    );

    expect(result).toBe(family);
    expect(client.query).toHaveBeenNthCalledWith(1, expect.stringContaining('INSERT INTO families'), [
      '上线测试家族',
      null,
      null,
      null,
      null,
      'user-1',
    ]);
    expect(client.query).toHaveBeenNthCalledWith(2, expect.stringContaining('INSERT INTO family_memberships'), [
      'family-1',
      'user-1',
      'owner',
      null,
    ]);
  });

  it('does not create an owner membership for unauthenticated development creates', async () => {
    const family = {
      id: 'family-2',
      name: '本地烟测家族',
      description: null,
      root_person_id: null,
      generation_name: null,
      hall_name: null,
      created_at: new Date('2026-05-08T00:00:00Z'),
      updated_at: new Date('2026-05-08T00:00:00Z'),
      created_by: 'system',
    };
    const client = {
      query: jest.fn().mockResolvedValueOnce({ rows: [family], rowCount: 1 }),
    };
    withTransactionMock.mockImplementationOnce(async (callback) => callback(client as never));

    const result = await new FamilyService().createFamily('本地烟测家族');

    expect(result).toBe(family);
    expect(client.query).toHaveBeenCalledTimes(1);
  });
});
