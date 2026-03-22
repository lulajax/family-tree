import { useState } from 'react';
import { useFamilyStore } from '../store/familyStore';
import type { Family } from '../types';

interface FamilySelectorProps {
  families: Family[];
  isLoading: boolean;
  onSelect: (familyId: string, rootPersonId: string | null) => void;
}

export const FamilySelector: React.FC<FamilySelectorProps> = ({
  families,
  isLoading,
  onSelect,
}) => {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { createFamily } = useFamilyStore();

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const family = await createFamily(newName.trim(), newDesc.trim() || undefined);
      onSelect(family.id, family.root_person_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
          双系族谱系统
        </h1>
        <p className="text-center text-gray-500 mb-8">
          选择一个家族开始浏览，或创建新家族
        </p>

        {/* 家族列表 */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-4">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">加载中...</div>
          ) : families.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              暂无家族，请先创建一个
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {families.map((family) => (
                <li key={family.id}>
                  <button
                    onClick={() => onSelect(family.id, family.root_person_id)}
                    className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium text-gray-800">
                        {family.name}
                      </div>
                      {family.description && (
                        <div className="text-sm text-gray-500 mt-0.5">
                          {family.description}
                        </div>
                      )}
                      {family.member_count != null && (
                        <div className="text-xs text-gray-400 mt-1">
                          {family.member_count} 位成员
                        </div>
                      )}
                    </div>
                    <svg
                      className="w-5 h-5 text-gray-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 创建家族 */}
        {showCreate ? (
          <div className="bg-white rounded-2xl shadow-lg p-5">
            <h3 className="font-semibold text-gray-800 mb-4">创建新家族</h3>
            {error && (
              <div className="mb-3 text-sm text-red-600 bg-red-50 rounded-lg p-2">
                {error}
              </div>
            )}
            <input
              type="text"
              placeholder="家族名称"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
              autoFocus
            />
            <textarea
              placeholder="描述（选填）"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowCreate(false);
                  setError(null);
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {creating ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCreate(true)}
            className="w-full py-3 text-center text-blue-500 hover:text-blue-600 font-medium"
          >
            + 创建新家族
          </button>
        )}
      </div>
    </div>
  );
};
