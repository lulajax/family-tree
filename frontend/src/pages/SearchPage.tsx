import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSearch, useFamily } from '../api/queries';
import { apiClient } from '../api/client';
import type { SearchResult } from '../api/queries';

interface AdvancedFilters {
  gender?: 'male' | 'female' | 'unknown';
  birthYearFrom?: number;
  birthYearTo?: number;
  hasChildren?: boolean;
}

export function SearchPage() {
  const { familyId } = useParams<{ familyId: string }>();
  const navigate = useNavigate();
  const { data: family } = useFamily(familyId ?? null);

  const [query, setQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filters, setFilters] = useState<AdvancedFilters>({});
  const [advancedResults, setAdvancedResults] = useState<SearchResult[] | null>(null);
  const [isSearchingAdvanced, setIsSearchingAdvanced] = useState(false);

  // Simple search
  const { data: simpleResults, isLoading } = useSearch(query, familyId);

  const results = advancedResults ?? simpleResults;

  const handleAdvancedSearch = async () => {
    setIsSearchingAdvanced(true);
    try {
      const body: Record<string, unknown> = {};
      if (query) body.name = query;
      if (familyId) body.familyId = familyId;
      if (filters.gender) body.gender = filters.gender;
      if (filters.birthYearFrom) body.birthYearFrom = filters.birthYearFrom;
      if (filters.birthYearTo) body.birthYearTo = filters.birthYearTo;
      if (filters.hasChildren !== undefined) body.hasChildren = filters.hasChildren;

      const data = await apiClient<SearchResult[]>('/search/advanced', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setAdvancedResults(data);
    } catch {
      // handled by UI
    } finally {
      setIsSearchingAdvanced(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    if (familyId) {
      navigate(`/families/${familyId}?person=${result.id}`);
    }
  };


  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          搜索{family ? ` — ${family.name}` : ''}
        </h1>
        <p className="text-sm text-gray-500 mt-1">在族谱中搜索人物</p>
      </div>

      {/* Search bar */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setAdvancedResults(null); }}
            placeholder="输入姓名搜索..."
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 pl-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            autoFocus
          />
          <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`px-4 py-2.5 border rounded-lg text-sm font-medium transition-colors ${
            showAdvanced ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          高级筛选
        </button>
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">性别</label>
              <select
                value={filters.gender ?? ''}
                onChange={(e) => setFilters(f => ({ ...f, gender: e.target.value as AdvancedFilters['gender'] || undefined }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">不限</option>
                <option value="male">男</option>
                <option value="female">女</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">有子女</label>
              <select
                value={filters.hasChildren === undefined ? '' : String(filters.hasChildren)}
                onChange={(e) => setFilters(f => ({
                  ...f,
                  hasChildren: e.target.value === '' ? undefined : e.target.value === 'true',
                }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">不限</option>
                <option value="true">有</option>
                <option value="false">无</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">出生年份（从）</label>
              <input
                type="number"
                value={filters.birthYearFrom ?? ''}
                onChange={(e) => setFilters(f => ({ ...f, birthYearFrom: e.target.value ? Number(e.target.value) : undefined }))}
                placeholder="例：1900"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">出生年份（至）</label>
              <input
                type="number"
                value={filters.birthYearTo ?? ''}
                onChange={(e) => setFilters(f => ({ ...f, birthYearTo: e.target.value ? Number(e.target.value) : undefined }))}
                placeholder="例：2000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <button
            onClick={handleAdvancedSearch}
            disabled={isSearchingAdvanced}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {isSearchingAdvanced ? '搜索中...' : '搜索'}
          </button>
        </div>
      )}

      {/* Results */}
      {(isLoading || isSearchingAdvanced) && (
        <div className="text-center py-12 text-gray-400">搜索中...</div>
      )}

      {!isLoading && !isSearchingAdvanced && results && results.length === 0 && query && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-2">未找到结果</div>
          <div className="text-gray-400 text-sm">尝试其他关键词或使用高级筛选</div>
        </div>
      )}

      {results && results.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-gray-500 mb-2">找到 {results.length} 个结果</div>
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => handleResultClick(r)}
              className="w-full text-left bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-800">{r.name}</span>
                  {r.highlight?.bio && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">{r.highlight.bio}</p>
                  )}
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      )}

      {!query && !advancedResults && (
        <div className="text-center py-16">
          <svg className="w-16 h-16 text-gray-200 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-gray-400">输入关键词开始搜索</p>
        </div>
      )}
    </div>
  );
}
