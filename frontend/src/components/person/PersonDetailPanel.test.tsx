import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { PersonNode } from '../../types';

vi.mock('../../api/mutations', () => ({
  useUploadPhoto: () => ({ mutate: vi.fn() }),
}));

vi.mock('../../api/queries', () => ({
  useRelationshipExplanation: () => ({
    data: {
      title: '表姐',
      reverse_title: '表妹',
      side: 'maternal',
      distance: 3,
      human_readable_path: ['我', '母亲', '舅舅', '表姐'],
      summary: '你应该称呼 TA 为「表姐」。',
    },
    isError: false,
  }),
}));

import { PersonDetailPanel } from './PersonDetailPanel';

const person: PersonNode = {
  id: 'target-1',
  name: '王小红',
  gender: 'female',
  birth_date: null,
  death_date: null,
  photo_url: null,
  birth_order: null,
  native_place: null,
  title: '亲戚',
  side: 'maternal',
};

describe('PersonDetailPanel kinship card', () => {
  it('renders the relationship explanation card before basic info', () => {
    const html = renderToStaticMarkup(
      <PersonDetailPanel
        person={person}
        referencePersonId="reference-1"
        onSetReference={vi.fn()}
        onClose={vi.fn()}
        onAddRelative={vi.fn()}
      />
    );

    expect(html).toContain('我该怎么称呼 TA');
    expect(html).toContain('表姐');
    expect(html).toContain('母系 · 3 步关系');
    expect(html.indexOf('我该怎么称呼 TA')).toBeLessThan(html.indexOf('基本信息'));
  });
});
