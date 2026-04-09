import { useState } from 'react';
import type { PersonNode } from '../../types';
import { NODE_W, NODE_H, COLORS } from '../../utils/dualTreeLayout';

interface TreeNodeCardProps {
  person: PersonNode;
  x: number;
  y: number;
  onClick: (person: PersonNode) => void;
  onContextMenu: (e: React.MouseEvent, person: PersonNode) => void;
  onAddRelative: (person: PersonNode) => void;
}

function getNodeColor(person: PersonNode): string {
  if (person.title === '本人') return COLORS.reference;
  if (person.gender === 'male') return COLORS.male;
  if (person.gender === 'female') return COLORS.female;
  return COLORS.unknown;
}

function getLifespan(person: PersonNode): string {
  const b = person.birth_date ? person.birth_date.substring(0, 4) : '?';
  const d = person.death_date ? person.death_date.substring(0, 4) : '';
  return d ? `${b}-${d}` : `${b}-`;
}

export function TreeNodeCard({ person, x, y, onClick, onContextMenu, onAddRelative }: TreeNodeCardProps) {
  const [hovered, setHovered] = useState(false);
  const isRef = person.title === '本人';
  const color = getNodeColor(person);
  const left = x - NODE_W / 2;
  const top = y - NODE_H / 2;

  return (
    <div
      className="absolute select-none"
      style={{
        left, top,
        width: NODE_W,
        height: NODE_H,
        transform: 'translateZ(0)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onClick(person)}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, person); }}
      role="treeitem"
      tabIndex={0}
      aria-label={`${person.name} - ${person.title}`}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(person); }}
    >
      {/* Card body */}
      <div
        className="w-full h-full rounded-[10px] cursor-pointer flex flex-col items-center justify-center transition-shadow duration-150"
        style={{
          backgroundColor: color,
          opacity: 0.92,
          border: isRef ? '2.5px solid #d97706' : '1px solid rgba(0,0,0,0.1)',
          boxShadow: hovered ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
        }}
      >
        {/* Photo + Name */}
        <div className="flex items-center gap-1.5 px-2 max-w-full">
          {person.photo_url && (
            <img
              src={person.photo_url}
              alt=""
              className="w-5 h-5 rounded-full object-cover flex-shrink-0"
            />
          )}
          <span className="text-white text-[13px] font-bold truncate">{person.name}</span>
        </div>
        {/* Title */}
        <span className="text-white/85 text-[11px] truncate px-2 max-w-full">{person.title}</span>
        {/* Lifespan */}
        <span className="text-white/60 text-[9px]">{getLifespan(person)}</span>
      </div>

      {/* Add button (visible on hover) */}
      <button
        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white border-[1.5px] border-blue-500 text-blue-500 text-sm font-bold flex items-center justify-center cursor-pointer transition-opacity duration-150"
        style={{ opacity: hovered ? 1 : 0, pointerEvents: hovered ? 'auto' : 'none' }}
        onClick={(e) => { e.stopPropagation(); onAddRelative(person); }}
        aria-label={`为 ${person.name} 添加亲属`}
        tabIndex={-1}
      >
        +
      </button>
    </div>
  );
}
