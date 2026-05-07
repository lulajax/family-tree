interface RelationshipPathViewProps {
  path: string[];
  compact?: boolean;
  className?: string;
}

export function RelationshipPathView({ path, compact = false, className = '' }: RelationshipPathViewProps) {
  if (path.length === 0) {
    return null;
  }

  return (
    <ol className={`flex flex-wrap items-center gap-1.5 ${className}`} aria-label="关系路径">
      {path.map((item, index) => (
        <li key={`${item}-${index}`} className="flex items-center gap-1.5">
          {index > 0 && <span className="text-xs opacity-50">→</span>}
          <span
            className={`rounded-full bg-white/75 font-medium shadow-sm ${
              compact ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
            }`}
          >
            {item}
          </span>
        </li>
      ))}
    </ol>
  );
}

export default RelationshipPathView;
