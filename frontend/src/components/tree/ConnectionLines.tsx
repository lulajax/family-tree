import type { LayoutLink } from '../../utils/dualTreeLayout';
import { NODE_W, NODE_H, COLORS } from '../../utils/dualTreeLayout';

interface ConnectionLinesProps {
  links: LayoutLink[];
}

export function ConnectionLines({ links }: ConnectionLinesProps) {
  return (
    <>
      {links.map((link, i) =>
        link.type === 'parent-child'
          ? <ParentChildLink key={`pc-${i}`} link={link} />
          : <SpouseLink key={`sp-${i}`} link={link} />
      )}
    </>
  );
}

function ParentChildLink({ link }: { link: LayoutLink }) {
  const { source, target } = link;
  const mx = (source.x + target.x) / 2;
  const my = (source.y + target.y) / 2;
  const d = `M${source.x},${source.y + NODE_H / 2} Q${source.x},${my} ${mx},${my} Q${target.x},${my} ${target.x},${target.y - NODE_H / 2}`;

  return (
    <path
      d={d}
      fill="none"
      stroke={COLORS.link}
      strokeWidth={1.5}
    />
  );
}

function SpouseLink({ link }: { link: LayoutLink }) {
  const { source, target } = link;
  return (
    <line
      x1={source.x + NODE_W / 2}
      y1={source.y}
      x2={target.x - NODE_W / 2}
      y2={target.y}
      stroke="#f59e0b"
      strokeWidth={2}
      strokeDasharray="6,3"
    />
  );
}
