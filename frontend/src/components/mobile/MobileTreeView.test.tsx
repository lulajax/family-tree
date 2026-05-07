import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MobileTreeView } from './MobileTreeView';
import type { DualTreeResponse, PersonNode } from '../../types';

function person(id: string, name: string, title: string, side: PersonNode['side'] = 'unknown'): PersonNode {
  return {
    id,
    name,
    title,
    side,
    gender: 'unknown',
    birth_date: null,
    death_date: null,
    photo_url: null,
    birth_order: null,
    native_place: null,
  };
}

const dualTree: DualTreeResponse = {
  reference: person('self', '我', '本人', 'self'),
  paternal: [{
    ancestor: person('father', '爸爸', '父亲', 'paternal'),
    spouses: [],
    siblings: [],
    spouseParents: [],
    spouseSiblings: [],
    generation: 1,
  }],
  maternal: [{
    ancestor: person('mother', '妈妈', '母亲', 'maternal'),
    spouses: [],
    siblings: [],
    spouseParents: [],
    spouseSiblings: [],
    generation: 1,
  }],
  siblings: [{ person: person('brother', '哥哥', '哥哥'), spouses: [], children: [] }],
  children: [{ person: person('child', '孩子', '子女'), spouses: [], spouseParents: [], children: [] }],
  spouses: [{ person: person('spouse', '爱人', '配偶', 'affinity'), ancestors: [], siblings: [] }],
};

describe('MobileTreeView', () => {
  it('renders relatives in productized mobile groups with set-reference actions', () => {
    const html = renderToStaticMarkup(
      <MobileTreeView dualTree={dualTree} onPersonClick={vi.fn()} onSetReference={vi.fn()} />
    );

    expect(html).toContain('焦点人物');
    expect(html).toContain('父系亲属');
    expect(html).toContain('母系亲属');
    expect(html).toContain('配偶与姻亲');
    expect(html).toContain('子女后代');
    expect(html).toContain('兄弟姐妹');
    expect(html).toContain('设为中心');
    expect(html).toContain('父亲');
  });
});
