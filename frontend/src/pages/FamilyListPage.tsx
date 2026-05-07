import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFamilies } from '../api/queries';
import { useCreateFamily } from '../api/mutations';
import type { Family } from '../types';
import { QuickStartChecklist } from '../components/onboarding/QuickStartChecklist';

export function FamilyListPage() {
  const navigate = useNavigate();
  const { data: families, isLoading, error } = useFamilies();
  const createFamily = useCreateFamily();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      const family = await createFamily.mutateAsync({
        name: newName.trim(),
        description: newDesc.trim() || undefined,
      });
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
      navigate(`/families/${family.id}`);
    } catch {
      // error handled by mutation
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          加载家族列表失败: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">家族列表</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          创建家族
        </button>
      </div>

      {(!families || families.length === 0) && !showCreate ? (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] items-start py-10">
          <div className="rounded-3xl bg-white p-8 shadow-sm border border-gray-100">
            <div className="text-5xl mb-5">🌳</div>
            <p className="text-sm font-semibold text-blue-600 mb-2">中文家庭称谓图谱</p>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">从“我”开始，搞清楚每一位亲戚该怎么称呼</h2>
            <p className="text-gray-500 mb-6 leading-relaxed">
              创建家庭空间后，你可以添加父母、配偶、子女和旁系亲属。系统会自动计算父系/母系/姻亲关系，点击任意亲戚即可看到称谓和关系路径。
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-sm"
            >
              创建第一个家庭
            </button>
          </div>
          <QuickStartChecklist />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {families?.map((family) => (
            <FamilyCard
              key={family.id}
              family={family}
              onClick={() => navigate(`/families/${family.id}`)}
            />
          ))}
        </div>
      )}

      {/* 创建对话框 */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form
            onSubmit={handleCreate}
            className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
          >
            <h2 className="text-lg font-bold mb-4">创建家族</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">家族名称</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例如：张氏家族"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述（可选）</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                  placeholder="家族简介..."
                />
              </div>
            </div>
            {createFamily.error && (
              <div className="mt-3 text-sm text-red-600">
                {createFamily.error.message}
              </div>
            )}
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={createFamily.isPending || !newName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {createFamily.isPending ? '创建中...' : '创建'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function FamilyCard({ family, onClick }: { family: Family; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-blue-200 transition-all group"
    >
      <h3 className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
        {family.name}
      </h3>
      {family.description && (
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{family.description}</p>
      )}
      <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
        {family.member_count !== undefined && (
          <span>{family.member_count} 人</span>
        )}
        {family.hall_name && (
          <span>堂号: {family.hall_name}</span>
        )}
      </div>
    </button>
  );
}
