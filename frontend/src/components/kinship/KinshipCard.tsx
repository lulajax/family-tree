import type { Side } from '../../types';
import { RelationshipPathView } from './RelationshipPathView';

export interface KinshipCardProps {
  title: string;
  reverseTitle?: string;
  side: Side;
  distance: number;
  path: string[];
  summary?: string;
  compact?: boolean;
}

const SIDE_META: Record<Side, { label: string; className: string }> = {
  paternal: {
    label: '父系',
    className: 'border-blue-200 bg-blue-50 text-blue-900',
  },
  maternal: {
    label: '母系',
    className: 'border-pink-200 bg-pink-50 text-pink-900',
  },
  affinity: {
    label: '姻亲',
    className: 'border-purple-200 bg-purple-50 text-purple-900',
  },
  self: {
    label: '本人',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  },
  unknown: {
    label: '未知',
    className: 'border-gray-200 bg-gray-50 text-gray-900',
  },
};

export function KinshipCard({
  title,
  reverseTitle,
  side,
  distance,
  path,
  summary,
  compact = false,
}: KinshipCardProps) {
  const meta = SIDE_META[side];

  return (
    <section
      className={`rounded-2xl border shadow-sm ${meta.className} ${compact ? 'p-3' : 'p-5'}`}
      aria-label={`称谓：${title}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium opacity-70">我该怎么称呼 TA</p>
          <h3 className={`${compact ? 'text-2xl' : 'text-3xl'} mt-1 font-bold tracking-tight`}>
            {title}
          </h3>
        </div>
        <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-semibold shadow-sm">
          {meta.label} · {distance} 步关系
        </span>
      </div>

      {reverseTitle && (
        <p className="mt-2 text-xs opacity-75">反向称谓：{reverseTitle}</p>
      )}

      {summary && <p className="mt-3 text-sm leading-relaxed opacity-85">{summary}</p>}

      <RelationshipPathView path={path} compact={compact} className="mt-4" />
    </section>
  );
}

export default KinshipCard;
