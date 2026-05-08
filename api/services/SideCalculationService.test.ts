import { sideCalculationService } from './SideCalculationService';
import { query } from '../config/database';

jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

const queryMock = query as jest.MockedFunction<typeof query>;

describe('SideCalculationService.determineSide', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('infers maternal side from the first parent edge when explicit sibling links have no common ancestor rows', async () => {
    queryMock
      // direct spouse check
      .mockResolvedValueOnce({ rows: [{ is_spouse: false }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
      // findCommonAncestor: ancestors of reference
      .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] })
      // findCommonAncestor: ancestors of target
      .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] })
      // getRelationshipPath: all relationships
      .mockResolvedValueOnce({
        rows: [
          { from_person_id: 'mother-1', to_person_id: 'me-1', type: 'parent_child', is_active: true },
          { from_person_id: 'mother-1', to_person_id: 'aunt-1', type: 'sibling', is_active: true },
          { from_person_id: 'aunt-1', to_person_id: 'cousin-1', type: 'parent_child', is_active: true },
        ],
        rowCount: 3,
        command: 'SELECT',
        oid: 0,
        fields: [],
      })
      // first parent gender lookup
      .mockResolvedValueOnce({ rows: [{ gender: 'female' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });

    await expect(sideCalculationService.determineSide('me-1', 'cousin-1')).resolves.toBe('maternal');
  });
});
