import { useState } from 'react';
import type { PersonNode } from '../../types';
import { NODE_W, NODE_H, COLORS } from '../../utils/dualTreeLayout';

interface TreeNodeCardProps {
  person: PersonNode;
  x: number;
  y: number;
  isReference?: boolean;
  childCount?: number;
  isCollapsed?: boolean;
  onClick: (person: PersonNode) => void;
  onContextMenu: (e: React.MouseEvent, person: PersonNode) => void;
  onAddRelative: (person: PersonNode) => void;
  onSetReference: (personId: string) => void;
  onToggleCollapse?: (personId: string) => void;
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

export function TreeNodeCard({ person, x, y, isReference, childCount, isCollapsed, onClick, onContextMenu, onAddRelative, onSetReference, onToggleCollapse }: TreeNodeCardProps) {
  const [hovered, setHovered] = useState(false);
  const isRef = person.title === '本人';
  const isDeceased = !!person.death_date;
  const isFormer = !!person.isFormerSpouse;
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
        className="w-full h-full rounded-xl cursor-pointer flex flex-col items-center justify-center gap-0.5 transition-shadow duration-150"
        style={{
          backgroundColor: color,
          opacity: isFormer ? 0.5 : isDeceased ? 0.65 : 0.92,
          border: isRef ? '2.5px solid #d97706' : isFormer ? '2px dashed #9ca3af' : '1px solid rgba(255,255,255,0.08)',
          boxShadow: hovered
            ? '0 6px 20px rgba(0,0,0,0.25), 0 0 0 2px rgba(255,255,255,0.1)'
            : '0 2px 8px rgba(0,0,0,0.12)',
        }}
      >
        {/* Photo + Name */}
        <div className="flex items-center gap-1.5 px-3 max-w-full">
          {person.photo_url && (
            <img
              src={person.photo_url}
              alt=""
              className="w-5 h-5 rounded-full object-cover flex-shrink-0"
            />
          )}
          <span className="text-white text-sm font-bold truncate">{isDeceased ? '故 ' : ''}{person.name}</span>
        </div>
        {/* Title */}
        <span className="text-white/80 text-xs truncate px-3 max-w-full">{person.title}</span>
        {/* Lifespan */}
        <span className="text-white/55 text-[10px]">{getLifespan(person)}</span>
      </div>

      {/* Set as reference button - top left (non-reference nodes only) */}
      {!isReference && (
        <button
          className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-white border-[1.5px] border-emerald-500 text-emerald-500 text-[10px] font-bold flex items-center justify-center cursor-pointer transition-opacity duration-150"
          style={{ opacity: hovered ? 1 : 0, pointerEvents: hovered ? 'auto' : 'none' }}
          onClick={(e) => { e.stopPropagation(); onSetReference(person.id); }}
          aria-label={`将 ${person.name} 设为焦点`}
          title="设为焦点"
          tabIndex={-1}
        >
          ↗
        </button>
      )}

      {/* Add relative button - top right */}
      <button
        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white border-[1.5px] border-blue-500 text-blue-500 text-sm font-bold flex items-center justify-center cursor-pointer transition-opacity duration-150"
        style={{ opacity: hovered ? 1 : 0, pointerEvents: hovered ? 'auto' : 'none' }}
        onClick={(e) => { e.stopPropagation(); onAddRelative(person); }}
        aria-label={`为 ${person.name} 添加亲属`}
        tabIndex={-1}
      >
        +
      </button>

      {/* Collapse/expand button - bottom center */}
      {childCount && childCount > 0 && onToggleCollapse && (
        <button
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 h-5 px-1.5 rounded-full bg-white border border-gray-300 text-gray-500 text-[10px] flex items-center justify-center cursor-pointer hover:bg-gray-50 shadow-sm"
          onClick={(e) => { e.stopPropagation(); onToggleCollapse(person.id); }}
          aria-label={isCollapsed ? `展开 ${childCount} 个子女` : '折叠子女'}
          title={isCollapsed ? `展开 ${childCount} 个子女` : '折叠子女'}
          tabIndex={-1}
        >
          {isCollapsed ? `+${childCount}` : '▼'}
        </button>
      )}
    </div>
  );
}
