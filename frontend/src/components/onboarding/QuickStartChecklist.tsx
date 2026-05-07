const STEPS = [
  '创建家庭',
  '添加“我”',
  '添加父母',
  '添加一位你不知道怎么称呼的亲戚',
  '邀请家人补充',
];

interface QuickStartChecklistProps {
  completedSteps?: number[];
  compact?: boolean;
}

export function QuickStartChecklist({ completedSteps = [], compact = false }: QuickStartChecklistProps) {
  return (
    <section className={`rounded-2xl border border-blue-100 bg-blue-50/70 ${compact ? 'p-4' : 'p-6'}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">快速开始</p>
      <h2 className="mt-1 text-lg font-bold text-slate-900">5 分钟建立可理解的家庭关系图谱</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        先从自己开始，逐步补充父母、亲戚和邀请家人。每一步都会让称谓和关系路径更准确。
      </p>
      <ol className="mt-4 space-y-2">
        {STEPS.map((step, index) => {
          const done = completedSteps.includes(index + 1);
          return (
            <li key={step} className="flex items-center gap-2 text-sm text-slate-700">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-emerald-500 text-white' : 'bg-white text-blue-600 shadow-sm'}`}>
                {done ? '✓' : index + 1}
              </span>
              <span>{step}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default QuickStartChecklist;
