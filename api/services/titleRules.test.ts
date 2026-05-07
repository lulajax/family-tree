import { matchTitleWithFallback } from './titleRules';

describe('matchTitleWithFallback', () => {
  it('matches direct parent titles', () => {
    expect(matchTitleWithFallback('parent', 'male', 'paternal', null, 'male')).toBe('父亲');
    expect(matchTitleWithFallback('parent', 'female', 'maternal', null, 'female')).toBe('母亲');
  });

  it('distinguishes paternal and maternal grandparents', () => {
    expect(matchTitleWithFallback('parent>parent', 'male', 'paternal', null, 'male')).toBe('爷爷');
    expect(matchTitleWithFallback('parent>parent', 'female', 'paternal', null, 'male')).toBe('奶奶');
    expect(matchTitleWithFallback('parent>parent', 'male', 'maternal', null, 'male')).toBe('外公');
    expect(matchTitleWithFallback('parent>parent', 'female', 'maternal', null, 'male')).toBe('外婆');
  });

  it('distinguishes paternal elder and younger uncles', () => {
    expect(matchTitleWithFallback('parent>sibling', 'male', 'paternal', true, 'male')).toBe('伯父');
    expect(matchTitleWithFallback('parent>sibling', 'male', 'paternal', false, 'male')).toBe('叔叔');
  });

  it('matches maternal siblings and cousins', () => {
    expect(matchTitleWithFallback('parent>sibling', 'male', 'maternal', null, 'male')).toBe('舅舅');
    expect(matchTitleWithFallback('parent>sibling', 'female', 'maternal', null, 'male')).toBe('姨妈');
    expect(matchTitleWithFallback('parent>sibling>child', 'female', 'maternal', true, 'male')).toBe('表姐');
    expect(matchTitleWithFallback('parent>sibling>child', 'male', 'maternal', false, 'female')).toBe('表弟');
  });

  it('matches spouse-side parents based on reference gender', () => {
    expect(matchTitleWithFallback('spouse>parent', 'female', 'affinity', null, 'male')).toBe('岳母');
    expect(matchTitleWithFallback('spouse>parent', 'male', 'affinity', null, 'female')).toBe('公公');
  });

  it('falls back to generic affinity or relative labels for unknown paths', () => {
    expect(matchTitleWithFallback('spouse>parent>sibling>child', 'male', 'affinity', null, 'male')).toBe('姻亲');
    expect(matchTitleWithFallback('parent>child>parent>child', 'female', 'paternal', null, 'male')).toBe('亲属');
  });
});
