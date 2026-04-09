import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useDualTree, useFamily } from '../api/queries';
import { apiClient } from '../api/client';
import { DualFamilyTree } from '../components/tree/DualFamilyTree';
import { PersonDetailPanel } from '../components/person/PersonDetailPanel';
import { AddRelativeDialog } from '../components/person/AddRelativeDialog';
import { FamilyHeader } from '../components/family/FamilyHeader';
import { MobileTreeView } from '../components/mobile/MobileTreeView';
import { BottomDrawer } from '../components/ui/BottomDrawer';
import { useMediaQuery } from '../hooks/useMediaQuery';
import type { PersonNode, DualTreeResponse, DescendantNode, CollateralFamily, Person } from '../types';

export function FamilyDashboard() {
  const { familyId } = useParams<{ familyId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = !useMediaQuery('(min-width: 768px)');

  const [referencePersonId, setReferencePersonId] = useState<string | null>(null);
  const [refHistory, setRefHistory] = useState<string[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [addRelativeTarget, setAddRelativeTarget] = useState<PersonNode | null>(null);

  const { data: family } = useFamily(familyId ?? null);

  // Auto-set reference to root person when family loads
  const effectiveRefId = referencePersonId ?? family?.root_person_id ?? null;

  const { data: dualTree, isLoading, error } = useDualTree(familyId ?? null, effectiveRefId);

  const selectedNode = dualTree && selectedPersonId
    ? findNodeInTree(dualTree, selectedPersonId)
    : null;

  const handleSetReference = useCallback((personId: string) => {
    if (effectiveRefId) {
      setRefHistory(prev => [...prev, effectiveRefId]);
    }
    setReferencePersonId(personId);
    setSelectedPersonId(null);
  }, [effectiveRefId]);

  const handleBack = useCallback(() => {
    setRefHistory(prev => {
      const next = [...prev];
      const last = next.pop();
      if (last) setReferencePersonId(last);
      return next;
    });
    setSelectedPersonId(null);
  }, []);

  const handleAddRelative = useCallback((person: PersonNode) => {
    setAddRelativeTarget(person);
  }, []);

  const handleAddRelativeSubmit = useCallback(async (
    personId: string,
    relationType: string,
    personData: { name: string; gender?: string; birth_date?: string; death_date?: string }
  ) => {
    await apiClient(`/persons/${personId}/add-relative`, {
      method: 'POST',
      body: JSON.stringify({ relation_type: relationType, person: personData }),
    });
    queryClient.invalidateQueries({ queryKey: ['dualTree'] });
  }, [queryClient]);

  const handleLinkExisting = useCallback(async (
    personId: string,
    relationType: string,
    existingPersonId: string,
  ) => {
    await apiClient(`/persons/${personId}/link-relative`, {
      method: 'POST',
      body: JSON.stringify({ relation_type: relationType, existing_person_id: existingPersonId }),
    });
    queryClient.invalidateQueries({ queryKey: ['dualTree'] });
  }, [queryClient]);

  const handleDelete = useCallback(async (person: PersonNode) => {
    await apiClient(`/persons/${person.id}`, { method: 'DELETE' });
    if (selectedPersonId === person.id) setSelectedPersonId(null);
    if (effectiveRefId === person.id) {
      // Switch to another person
      const nextRef = dualTree?.spouses[0]?.person
        ?? dualTree?.paternal[0]?.ancestor
        ?? dualTree?.children[0]?.person
        ?? null;
      setReferencePersonId(nextRef?.id ?? null);
    }
    queryClient.invalidateQueries({ queryKey: ['dualTree'] });
  }, [selectedPersonId, effectiveRefId, dualTree, queryClient]);

  const handleEdit = useCallback(async (
    person: PersonNode,
    data: { name: string; gender: string; birth_date?: string; death_date?: string; bio?: string }
  ) => {
    await apiClient(`/persons/${person.id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    queryClient.invalidateQueries({ queryKey: ['dualTree'] });
  }, [queryClient]);

  // If no family selected yet
  if (!familyId) {
    navigate('/');
    return null;
  }

  // Need to create first person
  if (family && !family.root_person_id) {
    return <FirstPersonCreator familyId={familyId} familyName={family.name} />;
  }

  // ── Mobile layout: list + bottom drawer ──
  if (isMobile) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex flex-col">
        {/* Family header (mobile) */}
        {family && (
          <div className="px-4 pt-3 pb-2 border-b border-gray-200 bg-white">
            <FamilyHeader family={family} />
          </div>
        )}

        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-gray-400">加载族谱中...</div>
          </div>
        )}

        {error && (
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="bg-red-50 text-red-700 p-4 rounded-lg w-full">
              加载失败: {error.message}
            </div>
          </div>
        )}

        {dualTree && (
          <div className="flex-1 overflow-y-auto px-4 py-2">
            <MobileTreeView
              dualTree={dualTree}
              onPersonClick={(p) => setSelectedPersonId(p.id)}
            />
          </div>
        )}

        {/* Bottom drawer for person details */}
        <BottomDrawer
          open={!!selectedNode}
          onClose={() => setSelectedPersonId(null)}
          title={selectedNode?.name}
        >
          {selectedNode && (
            <PersonDetailPanel
              person={selectedNode}
              referencePersonId={effectiveRefId ?? ''}
              onClose={() => setSelectedPersonId(null)}
              onSetReference={() => handleSetReference(selectedNode.id)}
              onAddRelative={() => handleAddRelative(selectedNode)}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          )}
        </BottomDrawer>

        {addRelativeTarget && (
          <AddRelativeDialog
            person={addRelativeTarget}
            familyId={familyId}
            onClose={() => setAddRelativeTarget(null)}
            onSubmit={handleAddRelativeSubmit}
            onLinkExisting={handleLinkExisting}
          />
        )}
      </div>
    );
  }

  // ── Desktop layout: tree + side panel ──
  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Tree area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Family header + back button */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          {refHistory.length > 0 && (
            <button
              onClick={handleBack}
              className="flex items-center gap-1 px-3 py-1.5 bg-white/90 backdrop-blur border border-gray-200 rounded-lg shadow-sm text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              title="返回上一个焦点"
            >
              <span>←</span>
              <span>返回</span>
            </button>
          )}
          {family && <FamilyHeader family={family} />}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-400">加载族谱中...</div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="bg-red-50 text-red-700 p-4 rounded-lg max-w-md">
              加载失败: {error.message}
            </div>
          </div>
        )}

        {dualTree && (
          <DualFamilyTree
            dualTree={dualTree}
            onPersonClick={(p) => setSelectedPersonId(p.id)}
            onSetReference={handleSetReference}
            onAddRelative={handleAddRelative}
            onDelete={handleDelete}
            onEdit={handleEdit}
          />
        )}
      </div>

      {/* Detail panel (desktop) */}
      {selectedNode && (
        <div className="w-80 border-l border-gray-200 bg-white overflow-y-auto">
          <PersonDetailPanel
            person={selectedNode}
            referencePersonId={effectiveRefId ?? ''}
            onClose={() => setSelectedPersonId(null)}
            onSetReference={() => handleSetReference(selectedNode.id)}
            onAddRelative={() => handleAddRelative(selectedNode)}
            onDelete={handleDelete}
            onEdit={handleEdit}
          />
        </div>
      )}

      {/* Add relative dialog */}
      {addRelativeTarget && (
        <AddRelativeDialog
          person={addRelativeTarget}
          onClose={() => setAddRelativeTarget(null)}
          onSubmit={handleAddRelativeSubmit}
        />
      )}
    </div>
  );
}

// ── First person creation ──

function FirstPersonCreator({ familyId, familyName }: { familyId: string; familyName: string }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [gender, setGender] = useState<string>('male');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const person = await apiClient<Person>('/persons', {
        method: 'POST',
        body: JSON.stringify({ family_id: familyId, name: name.trim(), gender }),
      });
      await apiClient(`/families/${familyId}/root`, {
        method: 'PUT',
        body: JSON.stringify({ person_id: person.id }),
      });
      queryClient.invalidateQueries({ queryKey: ['family', familyId] });
      queryClient.invalidateQueries({ queryKey: ['families'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold text-gray-800 mb-2">添加第一位成员</h2>
        <p className="text-sm text-gray-500 mb-6">为「{familyName}」添加第一位家族成员</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">性别</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="male">男</option>
              <option value="female">女</option>
              <option value="unknown">未知</option>
            </select>
          </div>
        </div>

        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}

        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="mt-6 w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {submitting ? '创建中...' : '创建并开始'}
        </button>
      </form>
    </div>
  );
}

// ── Tree node search helpers ──

function findInSpouses(spouses: PersonNode[] | undefined, personId: string): PersonNode | null {
  return spouses?.find(s => s.id === personId) ?? null;
}

function findInDescendants(descendants: DescendantNode[], personId: string): PersonNode | null {
  for (const desc of descendants) {
    if (desc.person.id === personId) return desc.person;
    const sp = findInSpouses(desc.spouses, personId);
    if (sp) return sp;
    // 搜索亲家（配偶的父母）
    const spParent = desc.spouseParents?.find(p => p.id === personId);
    if (spParent) return spParent;
    const found = findInDescendants(desc.children, personId);
    if (found) return found;
  }
  return null;
}

function findInCollateral(cf: CollateralFamily, personId: string): PersonNode | null {
  if (cf.person.id === personId) return cf.person;
  const sp = findInSpouses(cf.spouses, personId);
  if (sp) return sp;
  return findInDescendants(cf.children, personId);
}

function findNodeInTree(tree: DualTreeResponse, personId: string | null): PersonNode | null {
  if (!personId) return null;
  if (tree.reference.id === personId) return tree.reference;

  for (const layer of [...tree.paternal, ...tree.maternal]) {
    if (layer.ancestor.id === personId) return layer.ancestor;
    const ls = findInSpouses(layer.spouses, personId);
    if (ls) return ls;
    for (const cf of layer.siblings) {
      const f = findInCollateral(cf, personId);
      if (f) return f;
    }
    for (const sp of layer.spouseParents) {
      if (sp.id === personId) return sp;
    }
    for (const cf of layer.spouseSiblings) {
      const f = findInCollateral(cf, personId);
      if (f) return f;
    }
  }

  for (const cf of tree.siblings) {
    const f = findInCollateral(cf, personId);
    if (f) return f;
  }

  const childFound = findInDescendants(tree.children, personId);
  if (childFound) return childFound;

  for (const sf of tree.spouses) {
    if (sf.person.id === personId) return sf.person;
    for (const layer of sf.ancestors) {
      if (layer.ancestor.id === personId) return layer.ancestor;
      const ls = findInSpouses(layer.spouses, personId);
      if (ls) return ls;
      for (const cf of layer.siblings) {
        const f = findInCollateral(cf, personId);
        if (f) return f;
      }
      for (const sp of layer.spouseParents) {
        if (sp.id === personId) return sp;
      }
      for (const cf of layer.spouseSiblings) {
        const f = findInCollateral(cf, personId);
        if (f) return f;
      }
    }
    for (const sibCf of sf.siblings) {
      const f = findInCollateral(sibCf, personId);
      if (f) return f;
    }
  }

  return null;
}
