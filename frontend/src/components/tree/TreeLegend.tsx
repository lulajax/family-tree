import { useState } from 'react';
import { COLORS } from '../../utils/dualTreeLayout';

export function TreeLegend() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="absolute bottom-4 left-4">
      {collapsed ? (
        <button
          onClick={() => setCollapsed(false)}
          className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center hover:bg-white transition-colors"
          title="显示图例"
        >
          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      ) : (
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md px-3 py-2.5 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-gray-600">图例</span>
            <button
              onClick={() => setCollapsed(true)}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex gap-x-4 gap-y-1.5 flex-wrap">
            <LegendDot color={COLORS.male} label="男" />
            <LegendDot color={COLORS.female} label="女" />
            <LegendDot color={COLORS.reference} label="焦点" />
          </div>
          <div className="flex gap-x-4 gap-y-1.5 flex-wrap mt-1.5 pt-1.5 border-t border-gray-100">
            <LegendArea color={COLORS.paternalBg} border="rgba(59,130,246,0.3)" label="父系" />
            <LegendArea color={COLORS.maternalBg} border="rgba(236,72,153,0.3)" label="母系" />
            <LegendArea color={COLORS.affinityBg} border="rgba(245,158,11,0.3)" label="姻亲" />
          </div>
        </div>
      )}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
      <span className="text-gray-500">{label}</span>
    </div>
  );
}

function LegendArea({ color, border, label }: { color: string; border: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color, border: `1px solid ${border}` }} />
      <span className="text-gray-500">{label}</span>
    </div>
  );
}
