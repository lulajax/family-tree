import type { PersonNode } from '../../types';

interface TreeContextMenuProps {
  x: number;
  y: number;
  person: PersonNode;
  onClose: () => void;
  onViewDetail: (person: PersonNode) => void;
  onSetReference: (personId: string) => void;
  onAddRelative: (person: PersonNode) => void;
  onEdit?: (person: PersonNode) => void;
  onDelete?: (person: PersonNode) => void;
}

export function TreeContextMenu({
  x, y, person, onClose,
  onViewDetail, onSetReference, onAddRelative, onEdit, onDelete,
}: TreeContextMenuProps) {
  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <>
      {/* Backdrop to close menu */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Menu */}
      <div
        className="fixed bg-white rounded-lg shadow-xl border py-1 z-50 min-w-[150px]"
        style={{ left: x, top: y }}
      >
        <div className="px-3 py-2 border-b text-sm font-semibold">{person.name}</div>

        <button
          onClick={() => handleAction(() => onViewDetail(person))}
          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
        >
          查看详情
        </button>

        {onEdit && (
          <button
            onClick={() => handleAction(() => onEdit(person))}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
          >
            编辑信息
          </button>
        )}

        <button
          onClick={() => handleAction(() => onSetReference(person.id))}
          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
        >
          设为焦点
        </button>

        <button
          onClick={() => handleAction(() => onAddRelative(person))}
          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
        >
          添加亲属
        </button>

        {onDelete && (
          <>
            <div className="border-t my-1" />
            <button
              onClick={() => handleAction(() => onDelete(person))}
              className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            >
              删除人物
            </button>
          </>
        )}
      </div>
    </>
  );
}
