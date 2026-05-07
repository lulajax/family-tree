import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { KinshipCard } from './KinshipCard';
import { RelationshipPathView } from './RelationshipPathView';

describe('KinshipCard', () => {
  it('renders the kinship title, side label, distance, summary, and path chips', () => {
    const html = renderToStaticMarkup(
      <KinshipCard
        title="表姐"
        reverseTitle="表妹"
        side="maternal"
        distance={3}
        path={['我', '母亲', '舅舅', '表姐']}
        summary="你应该称呼 TA 为「表姐」。"
      />
    );

    expect(html).toContain('表姐');
    expect(html).toContain('反向称谓：表妹');
    expect(html).toContain('母系 · 3 步关系');
    expect(html).toContain('你应该称呼 TA 为「表姐」。');
    expect(html).toContain('我');
    expect(html).toContain('母亲');
    expect(html).toContain('舅舅');
  });

  it('uses a compact layout class when compact is true', () => {
    const html = renderToStaticMarkup(
      <KinshipCard title="本人" side="self" distance={0} path={['我']} compact />
    );

    expect(html).toContain('本人');
    expect(html).toContain('本人 · 0 步关系');
    expect(html).toContain('p-3');
  });
});

describe('RelationshipPathView', () => {
  it('renders each path item as an ordered chip separated by arrows', () => {
    const html = renderToStaticMarkup(<RelationshipPathView path={['我', '父亲', '姑姑']} />);

    expect(html).toContain('我');
    expect(html).toContain('父亲');
    expect(html).toContain('姑姑');
    expect(html).toContain('→');
  });
});
