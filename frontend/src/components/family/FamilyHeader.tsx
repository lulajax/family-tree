import type { Family } from '../../types';

interface FamilyHeaderProps {
  family: Family;
}

export function FamilyHeader({ family }: FamilyHeaderProps) {
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-lg px-4 py-3 shadow-sm border border-gray-200">
      <h2 className="font-bold text-gray-800">{family.name}</h2>
      <div className="flex flex-wrap items-center gap-2 mt-1">
        {family.hall_name && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            堂号: {family.hall_name}
          </span>
        )}
        {family.member_count != null && (
          <span className="text-xs text-gray-500">
            {family.member_count} 人
          </span>
        )}
      </div>
      {family.generation_name && (
        <div className="mt-2">
          <span className="text-xs text-gray-500">字辈: </span>
          <span className="text-xs text-gray-700 tracking-widest">{family.generation_name}</span>
        </div>
      )}
    </div>
  );
}
