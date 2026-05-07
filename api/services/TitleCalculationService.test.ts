import { titleCalculationService } from './TitleCalculationService';
import { sideCalculationService } from './SideCalculationService';

describe('TitleCalculationService.calculateRelationshipExplanation', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('wraps calculated title into a product-ready relationship explanation', async () => {
    jest.spyOn(titleCalculationService, 'calculateTitle').mockResolvedValue({
      title: '表姐',
      reverse_title: '表妹',
      relationship_path: ['parent', 'sibling', 'child'],
      side: 'maternal',
      distance: 3,
      temporal_context: { relationship_status: 'current' },
    });
    jest.spyOn(sideCalculationService, 'findCommonAncestor').mockResolvedValue({
      ancestor_id: 'ancestor-1',
      ancestor_name: '外婆',
      person1_generation: 2,
      person2_generation: 2,
      person1_path: ['reference', 'mother', 'grandmother'],
      person2_path: ['target', 'aunt', 'grandmother'],
    });

    const result = await titleCalculationService.calculateRelationshipExplanation('reference-1', 'target-1');

    expect(result).toEqual({
      reference_person_id: 'reference-1',
      target_person_id: 'target-1',
      title: '表姐',
      reverse_title: '表妹',
      side: 'maternal',
      distance: 3,
      relationship_path: ['parent', 'sibling', 'child'],
      human_readable_path: ['父母', '兄弟姐妹', '子女'],
      summary: '你应该称呼 TA 为「表姐」。关系路径：你 → 父母 → 兄弟姐妹 → 子女 → TA。',
      confidence: 'exact',
      common_ancestor: {
        ancestor_id: 'ancestor-1',
        ancestor_name: '外婆',
        person1_generation: 2,
        person2_generation: 2,
      },
    });
  });
});
