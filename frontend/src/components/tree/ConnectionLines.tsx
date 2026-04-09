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
          : link.type === 'former-spouse'
            ? <FormerSpouseLink key={`fs-${i}`} link={link} />
            : <SpouseLink key={`sp-${i}`} link={link} />
      )}
    </>
  );
}

/** Clean orthogonal (elbow) connector with rounded corners */
function ParentChildLink({ link }: { link: LayoutLink }) {
  const { source, target } = link;
  const y1 = source.y + NODE_H / 2;
  const y2 = target.y - NODE_H / 2;
  const midY = (y1 + y2) / 2;

  // Straight vertical line when aligned
  if (Math.abs(source.x - target.x) < 1) {
    return (
      <line
        x1={source.x} y1={y1}
        x2={target.x} y2={y2}
        stroke={COLORS.link}
        strokeWidth={1.5}
      />
    );
  }

  // Orthogonal elbow with rounded corners
  const r = Math.min(10, Math.abs(source.x - target.x) / 2, Math.abs(midY - y1) / 2, Math.abs(y2 - midY) / 2);
  const dx = target.x > source.x ? 1 : -1;

  const d = [
    `M ${source.x} ${y1}`,
    `L ${source.x} ${midY - r}`,
    `Q ${source.x} ${midY} ${source.x + dx * r} ${midY}`,
    `L ${target.x - dx * r} ${midY}`,
    `Q ${target.x} ${midY} ${target.x} ${midY + r}`,
    `L ${target.x} ${y2}`,
  ].join(' ');

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
  const x1 = source.x + NODE_W / 2;
  const x2 = target.x - NODE_W / 2;
  const y = source.y;

  return (
    <line
      x1={x1} y1={y}
      x2={x2} y2={target.y}
      stroke="#f59e0b"
      strokeWidth={2}
      strokeDasharray="6,3"
    />
  );
}

function FormerSpouseLink({ link }: { link: LayoutLink }) {
  const { source, target } = link;
  return (
    <line
      x1={source.x + NODE_W / 2}
      y1={source.y}
      x2={target.x - NODE_W / 2}
      y2={target.y}
      stroke="#9ca3af"
      strokeWidth={1.5}
      strokeDasharray="4,4"
      opacity={0.6}
    />
  );
}
