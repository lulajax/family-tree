import { useEffect, useState } from 'react';
import { useFamilyStore } from './store/familyStore';
import { DualFamilyTree } from './components/tree/DualFamilyTree';
import { FamilySelector } from './components/FamilySelector';
import { PersonDetailPanel } from './components/person/PersonDetailPanel';
import { AddRelativeDialog } from './components/person/AddRelativeDialog';
import type { PersonNode, DualTreeResponse, DescendantNode } from './types';

export default function App() {
  const {
    families,
    currentFamilyId,
    referencePersonId,
    selectedPersonId,
    dualTree,
    isLoading,
    error,
    fetchFamilies,
    fetchDualTree,
    setCurrentFamily,
    setReferencePerson,
    setSelectedPerson,
    setError,
    deletePerson,
    updatePerson,
  } = useFamilyStore();

  const [addRelativeTarget, setAddRelativeTarget] = useState<PersonNode | null>(null);

  useEffect(() => {
    void fetchFamilies();
  }, [fetchFamilies]);

  // 选择家族后自动加载
  useEffect(() => {
    if (currentFamilyId && referencePersonId) {
      void fetchDualTree();
    }
  }, [currentFamilyId, referencePersonId, fetchDualTree]);

  const handlePersonClick = (person: PersonNode) => {
    setSelectedPerson(person.id);
  };

  const handleSetReference = (personId: string) => {
    setReferencePerson(personId);
    setSelectedPerson(null);
  };

  const handleAddRelative = (person: PersonNode) => {
    setAddRelativeTarget(person);
  };

  const handleDeletePerson = async (person: PersonNode) => {
    await deletePerson(person.id);
  };

  const handleEditPerson = async (
    person: PersonNode,
    data: {
      name: string;
      gender: 'male' | 'female' | 'unknown';
      birth_date?: string;
      death_date?: string;
      bio?: string;
    }
  ) => {
    await updatePerson(person.id, data);
  };

  // 未选择家族 → 显示家族选择器
  if (!currentFamilyId) {
    return (
      <FamilySelector
        families={families}
        isLoading={isLoading}
        onSelect={(familyId, rootPersonId) => {
          setCurrentFamily(familyId);
          if (rootPersonId) setReferencePerson(rootPersonId);
        }}
      />
    );
  }

  // 选择了家族但没有参考人 → 创建第一个成员
  if (!referencePersonId) {
    return (
      <CreateFirstPersonView
        onBack={() => setCurrentFamily('')}
      />
    );
  }

  const selectedNode = dualTree
    ? findNodeInTree(dualTree, selectedPersonId)
    : null;

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-gray-100">
      {/* 主区域：双系图谱 */}
      <div className="flex-1 relative">
        {/* 顶部栏 */}
        <header className="absolute top-0 left-0 right-0 z-10 bg-white/90 backdrop-blur border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setCurrentFamily(''); }}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              ← 家族列表
            </button>
            <h1 className="font-semibold text-lg">
              {families.find((f) => f.id === currentFamilyId)?.name ?? '家族图谱'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              焦点：{dualTree?.reference.name ?? '加载中...'}
            </span>
            {dualTree && (
              <button
                onClick={() => setAddRelativeTarget(dualTree.reference)}
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                + 添加亲属
              </button>
            )}
          </div>
        </header>

        {/* 图谱 */}
        {error && (
          <div className="absolute top-16 left-4 right-4 z-10 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">关闭</button>
          </div>
        )}

        {isLoading && !dualTree && (
          <div className="flex items-center justify-center h-full pt-16">
            <div className="text-gray-400">加载中...</div>
          </div>
        )}

        {dualTree && (
          <div className="h-full pt-14">
            <DualFamilyTree
              dualTree={dualTree}
              onPersonClick={handlePersonClick}
              onSetReference={handleSetReference}
              onAddRelative={handleAddRelative}
              onDelete={handleDeletePerson}
              onEdit={handleEditPerson}
            />
          </div>
        )}
      </div>

      {/* 右侧详情面板 */}
      {selectedNode && (
        <aside className="w-96 bg-white border-l border-gray-200 overflow-auto">
          <PersonDetailPanel
            person={selectedNode}
            referencePersonId={referencePersonId}
            onSetReference={handleSetReference}
            onClose={() => setSelectedPerson(null)}
            onAddRelative={() => setAddRelativeTarget(selectedNode)}
            onDelete={handleDeletePerson}
            onEdit={handleEditPerson}
          />
        </aside>
      )}

      {/* 添加亲属对话框 */}
      {addRelativeTarget && (
        <AddRelativeDialog
          targetPerson={addRelativeTarget}
          onClose={() => setAddRelativeTarget(null)}
        />
      )}
    </div>
  );
}

function CreateFirstPersonView({ onBack }: { onBack: () => void }) {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'unknown'>('male');
  const [birthDate, setBirthDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { createFirstPerson } = useFamilyStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await createFirstPerson({
        name: name.trim(),
        gender,
        birth_date: birthDate || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        <h2 className="text-xl font-semibold mb-2">添加第一个成员</h2>
        <p className="text-gray-500 text-sm mb-6">
          这个家族还没有成员，请添加第一个人作为图谱的起始焦点。
        </p>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              姓名 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入姓名"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">性别</label>
            <div className="flex gap-2">
              {([['male', '男'], ['female', '女'], ['unknown', '未知']] as const).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setGender(v)}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                    gender === v
                      ? v === 'male'
                        ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
                        : v === 'female'
                          ? 'bg-pink-50 border-pink-300 text-pink-700 font-medium'
                          : 'bg-gray-100 border-gray-300 text-gray-700 font-medium'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">出生日期</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              返回
            </button>
            <button
              type="submit"
              disabled={!name.trim() || submitting}
              className="flex-1 px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {submitting ? '创建中...' : '创建并开始'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** 在递归后代树中查找节点 */
function findInDescendants(descendants: DescendantNode[], personId: string): PersonNode | null {
  for (const desc of descendants) {
    if (desc.person.id === personId) return desc.person;
    if (desc.spouse?.id === personId) return desc.spouse;
    const found = findInDescendants(desc.children, personId);
    if (found) return found;
  }
  return null;
}

function findNodeInTree(tree: DualTreeResponse, personId: string | null): PersonNode | null {
  if (!personId) return null;
  if (tree.reference.id === personId) return tree.reference;

  for (const layer of [...tree.paternal, ...tree.maternal]) {
    if (layer.ancestor.id === personId) return layer.ancestor;
    if (layer.spouse?.id === personId) return layer.spouse;
    for (const cf of layer.siblings) {
      if (cf.person.id === personId) return cf.person;
      if (cf.spouse?.id === personId) return cf.spouse;
      const found = findInDescendants(cf.children, personId);
      if (found) return found;
    }
    // 配偶的父母
    for (const sp of layer.spouseParents) {
      if (sp.id === personId) return sp;
    }
    // 配偶的兄弟姐妹
    for (const cf of layer.spouseSiblings) {
      if (cf.person.id === personId) return cf.person;
      if (cf.spouse?.id === personId) return cf.spouse;
      const found = findInDescendants(cf.children, personId);
      if (found) return found;
    }
  }

  // 参考人兄弟（CollateralFamily[]）
  for (const cf of tree.siblings) {
    if (cf.person.id === personId) return cf.person;
    if (cf.spouse?.id === personId) return cf.spouse;
    const found = findInDescendants(cf.children, personId);
    if (found) return found;
  }

  // 子女（递归后代树）
  const childFound = findInDescendants(tree.children, personId);
  if (childFound) return childFound;

  // 配偶家族（SpouseFamily[]）
  for (const sf of tree.spouses) {
    if (sf.person.id === personId) return sf.person;
    // 配偶的祖先链
    for (const layer of sf.ancestors) {
      if (layer.ancestor.id === personId) return layer.ancestor;
      if (layer.spouse?.id === personId) return layer.spouse;
      for (const cf of layer.siblings) {
        if (cf.person.id === personId) return cf.person;
        if (cf.spouse?.id === personId) return cf.spouse;
        const found = findInDescendants(cf.children, personId);
        if (found) return found;
      }
      for (const sp of layer.spouseParents) {
        if (sp.id === personId) return sp;
      }
      for (const cf of layer.spouseSiblings) {
        if (cf.person.id === personId) return cf.person;
        if (cf.spouse?.id === personId) return cf.spouse;
        const found = findInDescendants(cf.children, personId);
        if (found) return found;
      }
    }
    // 配偶的兄弟姐妹
    for (const sibCf of sf.siblings) {
      if (sibCf.person.id === personId) return sibCf.person;
      if (sibCf.spouse?.id === personId) return sibCf.spouse;
      const found = findInDescendants(sibCf.children, personId);
      if (found) return found;
    }
  }

  return null;
}
