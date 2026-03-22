import React, { useState, useCallback, useMemo, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Person, RelationPathNode } from '../../types';
import { useFamilyStore } from '../../store/familyStore';
import { useSwipe } from '../../hooks/useGestures';
import { RelationPathCard } from './RelationPathCard';
import { Search, Filter, ChevronLeft, ChevronRight, Users } from 'lucide-react';

interface MobileTreeViewProps {
  familyId: string;
  referencePersonId: string;
  onPersonClick: (person: Person) => void;
}

// 列表项高度
const ITEM_HEIGHT = 100;

export const MobileTreeView: React.FC<MobileTreeViewProps> = ({
  familyId,
  referencePersonId,
  onPersonClick,
}) => {
  const { persons, getPersonById, getAncestors, getDescendants, getSiblings, getSpouses } = useFamilyStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'ancestors' | 'descendants' | 'siblings' | 'spouses'>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const listRef = useRef<List>(null);

  const referencePerson = getPersonById(referencePersonId);

  // 获取关系路径
  const getRelationPath = useCallback((person: Person): RelationPathNode[] => {
    if (person.id === referencePersonId) return [];

    const path: RelationPathNode[] = [];
    const visited = new Set<string>();
    const queue: { person: Person; path: RelationPathNode[] }[] = [
      { person: referencePerson!, path: [] },
    ];

    while (queue.length > 0) {
      const { person: current, path: currentPath } = queue.shift()!;

      if (current.id === person.id) {
        return currentPath;
      }

      if (visited.has(current.id)) continue;
      visited.add(current.id);

      // 添加父母
      if (current.fatherId) {
        const father = getPersonById(current.fatherId);
        if (father) {
          queue.push({
            person: father,
            path: [...currentPath, { person: father, relation: '父亲', direction: 'up' }],
          });
        }
      }
      if (current.motherId) {
        const mother = getPersonById(current.motherId);
        if (mother) {
          queue.push({
            person: mother,
            path: [...currentPath, { person: mother, relation: '母亲', direction: 'up' }],
          });
        }
      }

      // 添加子女
      if (current.childrenIds) {
        for (const childId of current.childrenIds) {
          const child = getPersonById(childId);
          if (child) {
            const relation = child.gender === 'MALE' ? '儿子' : '女儿';
            queue.push({
              person: child,
              path: [...currentPath, { person: child, relation, direction: 'down' }],
            });
          }
        }
      }

      // 添加配偶
      if (current.spouseIds) {
        for (const spouseId of current.spouseIds) {
          const spouse = getPersonById(spouseId);
          if (spouse) {
            const relation = spouse.gender === 'MALE' ? '丈夫' : '妻子';
            queue.push({
              person: spouse,
              path: [...currentPath, { person: spouse, relation, direction: 'same' }],
            });
          }
        }
      }
    }

    return path;
  }, [referencePersonId, referencePerson, getPersonById]);

  // 获取过滤后的人员列表
  const filteredPersons = useMemo(() => {
    let result = [...persons];

    // 按类型过滤
    switch (filterType) {
      case 'ancestors':
        result = referencePerson ? getAncestors(referencePersonId, 10) : [];
        break;
      case 'descendants':
        result = referencePerson ? getDescendants(referencePersonId, 10) : [];
        break;
      case 'siblings':
        result = referencePerson ? getSiblings(referencePersonId) : [];
        break;
      case 'spouses':
        result = referencePerson ? getSpouses(referencePersonId) : [];
        break;
      default:
        break;
    }

    // 搜索过滤
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.generation.toString().includes(query)
      );
    }

    // 按代际排序
    return result.sort((a, b) => {
      // 参考点排在最前面
      if (a.id === referencePersonId) return -1;
      if (b.id === referencePersonId) return 1;
      
      // 按代际排序
      if (a.generation !== b.generation) {
        return a.generation - b.generation;
      }
      
      // 同代按姓名排序
      return a.name.localeCompare(b.name);
    });
  }, [persons, filterType, referencePerson, referencePersonId, getAncestors, getDescendants, getSiblings, getSpouses, searchQuery]);

  // 滑动切换过滤类型
  const { onTouchStart, onTouchMove, onTouchEnd } = useSwipe({
    onSwipeLeft: () => {
      const types: typeof filterType[] = ['all', 'ancestors', 'descendants', 'siblings', 'spouses'];
      const currentIndex = types.indexOf(filterType);
      if (currentIndex < types.length - 1) {
        setFilterType(types[currentIndex + 1]);
      }
    },
    onSwipeRight: () => {
      const types: typeof filterType[] = ['all', 'ancestors', 'descendants', 'siblings', 'spouses'];
      const currentIndex = types.indexOf(filterType);
      if (currentIndex > 0) {
        setFilterType(types[currentIndex - 1]);
      }
    },
    threshold: 80,
  });

  // 列表项渲染
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const person = filteredPersons[index];
    const path = getRelationPath(person);

    return (
      <div style={style} className="px-4 py-2">
        <RelationPathCard
          person={person}
          path={path}
          isReference={person.id === referencePersonId}
          onClick={() => onPersonClick(person)}
        />
      </div>
    );
  }, [filteredPersons, getRelationPath, referencePersonId, onPersonClick]);

  // 获取过滤类型标签
  const getFilterLabel = (type: typeof filterType): string => {
    const labels: Record<typeof filterType, string> = {
      all: '全部',
      ancestors: '祖先',
      descendants: '后代',
      siblings: '兄弟姐妹',
      spouses: '配偶',
    };
    return labels[type];
  };

  return (
    <div 
      className="flex flex-col h-full bg-gray-50"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* 顶部栏 */}
      <div className="bg-white shadow-sm px-4 py-3">
        {/* 参考点信息 */}
        {referencePerson && (
          <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-100">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500">当前参考点</p>
              <p className="font-semibold text-gray-900">
                {referencePerson.name}
                <span className="text-xs font-normal text-gray-500 ml-2">
                  第{referencePerson.generation}代
                </span>
              </p>
            </div>
          </div>
        )}

        {/* 搜索栏 */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索姓名..."
              className="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`p-2 rounded-lg transition-colors ${
              isFilterOpen ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
            }`}
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>

        {/* 过滤器选项 */}
        {isFilterOpen && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex flex-wrap gap-2">
              {(['all', 'ancestors', 'descendants', 'siblings', 'spouses'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setFilterType(type);
                    setIsFilterOpen(false);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    filterType === type
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {getFilterLabel(type)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 过滤类型指示器 */}
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              const types: typeof filterType[] = ['all', 'ancestors', 'descendants', 'siblings', 'spouses'];
              const currentIndex = types.indexOf(filterType);
              if (currentIndex > 0) {
                setFilterType(types[currentIndex - 1]);
              }
            }}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
            disabled={filterType === 'all'}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-gray-700">
            {getFilterLabel(filterType)}
            <span className="text-xs text-gray-400 ml-1">({filteredPersons.length})</span>
          </span>
          <button
            onClick={() => {
              const types: typeof filterType[] = ['all', 'ancestors', 'descendants', 'siblings', 'spouses'];
              const currentIndex = types.indexOf(filterType);
              if (currentIndex < types.length - 1) {
                setFilterType(types[currentIndex + 1]);
              }
            }}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
            disabled={filterType === 'spouses'}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 虚拟列表 */}
      <div className="flex-1 overflow-hidden">
        {filteredPersons.length > 0 ? (
          <AutoSizer>
            {({ height, width }) => (
              <List
                ref={listRef}
                height={height}
                itemCount={filteredPersons.length}
                itemSize={ITEM_HEIGHT}
                width={width}
                overscanCount={3}
              >
                {Row}
              </List>
            )}
          </AutoSizer>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Users className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">没有找到匹配的人员</p>
          </div>
        )}
      </div>

      {/* 滑动提示 */}
      <div className="bg-white border-t border-gray-200 px-4 py-2 text-center">
        <p className="text-xs text-gray-400">
          左右滑动切换分类 · 点击查看详情
        </p>
      </div>
    </div>
  );
};

export default MobileTreeView;
