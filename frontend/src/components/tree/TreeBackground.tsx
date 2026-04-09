import type { RegionInfo } from '../../utils/dualTreeLayout';
import { NODE_H } from '../../utils/dualTreeLayout';

interface TreeBackgroundProps {
  regions: RegionInfo[];
  hasBothSides: boolean;
  minY: number;
  maxY: number;
}

const LABEL_COLORS: Record<string, string> = {
  '父系血统': '#3b82f6',
  '母系血统': '#ec4899',
  '姻亲': '#d97706',
};

export function TreeBackground({ regions, hasBothSides, minY, maxY }: TreeBackgroundProps) {
  return (
    <>
      {/* Background regions */}
      {regions.map((r) => (
        <g key={r.label}>
          <rect
            x={r.minX} y={r.minY}
            width={r.maxX - r.minX} height={r.maxY - r.minY}
            rx={20} fill={r.color} stroke={r.strokeColor} strokeWidth={1}
            strokeDasharray="6,4"
          />
          <text
            x={(r.minX + r.maxX) / 2} y={r.minY + 22}
            textAnchor="middle"
            fill={LABEL_COLORS[r.label] ?? '#666'}
            fontSize="13px" fontWeight="500" opacity={0.55}
          >
            {r.label}
          </text>
        </g>
      ))}

      {/* Center divider line */}
      {hasBothSides && (
        <line
          x1={0} y1={minY - NODE_H - 40}
          x2={0} y2={maxY + NODE_H + 20}
          stroke="#e2e8f0"
          strokeWidth={1.5}
          strokeDasharray="8,4"
          opacity={0.5}
        />
      )}
    </>
  );
}
