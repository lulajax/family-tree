import type { PersonNode } from '../../types';

interface RelativeGroupSectionProps {
  title: string;
  relatives: PersonNode[];
  emptyText?: string;
  onPersonClick: (person: PersonNode) => void;
  onSetReference?: (personId: string) => void;
}

const GENDER_COLORS = {
  male: 'bg-blue-500',
  female: 'bg-pink-500',
  unknown: 'bg-gray-400',
} as const;

const SIDE_LABELS: Record<PersonNode['side'], string> = {
  paternal: '父系',
  maternal: '母系',
  affinity: '姻亲',
  self: '本人',
  unknown: '亲属',
};

export function RelativeGroupSection({
  title,
  relatives,
  emptyText = '暂无亲属',
  onPersonClick,
  onSetReference,
}: RelativeGroupSectionProps) {
  return (
    <section className="rounded-2xl bg-white p-3 shadow-sm border border-gray-100">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{relatives.length}</span>
      </div>

      {relatives.length === 0 ? (
        <p className="py-3 text-sm text-gray-400">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {relatives.map((person) => (
            <div key={person.id} className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 p-2">
              <button
                type="button"
                onClick={() => onPersonClick(person)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                {person.photo_url ? (
                  <img src={person.photo_url} alt="" className="h-10 w-10 flex-shrink-0 rounded-full object-cover" />
                ) : (
                  <div className={`h-10 w-10 flex-shrink-0 rounded-full ${GENDER_COLORS[person.gender] ?? 'bg-gray-400'} flex items-center justify-center text-sm font-bold text-white`}>
                    {person.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold text-gray-800">{person.name}</span>
                    <span className="flex-shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-700">
                      {person.title || SIDE_LABELS[person.side]}
                    </span>
                  </div>
                  <p className="truncate text-xs text-gray-500">{SIDE_LABELS[person.side]} · {person.title || '待确认关系'}</p>
                </div>
              </button>

              {onSetReference && person.side !== 'self' && (
                <button
                  type="button"
                  onClick={() => onSetReference(person.id)}
                  className="flex-shrink-0 rounded-lg bg-white px-2 py-1 text-xs font-medium text-amber-700 shadow-sm border border-amber-100"
                >
                  设为中心
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default RelativeGroupSection;
