import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFamilyStore } from '../store/familyStore';
import { Person, Gender } from '../types';
import { Search, ArrowLeft, User, SlidersHorizontal, X } from 'lucide-react';

const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const { persons, getPersonById, currentFamilyId } = useFamilyStore();
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    gender: '' as '' | Gender,
    generation: '' as string,
  });

  // 搜索结果
  const results = useMemo(() => {
    let filtered = [...persons];

    // 搜索词过滤
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(lowerQuery)
      );
    }

    // 性别过滤
    if (filters.gender) {
      filtered = filtered.filter(p => p.gender === filters.gender);
    }

    // 代际过滤
    if (filters.generation) {
      const gen = parseInt(filters.generation);
      filtered = filtered.filter(p => p.generation === gen);
    }

    // 按代际排序
    return filtered.sort((a, b) => {
      if (a.generation !== b.generation) {
        return a.generation - b.generation;
      }
      return a.name.localeCompare(b.name);
    });
  }, [persons, query, filters]);

  // 获取所有代际
  const generations = useMemo(() => {
    const gens = new Set(persons.map(p => p.generation));
    return Array.from(gens).sort((a, b) => a - b);
  }, [persons]);

  // 处理人员点击
  const handlePersonClick = (person: Person) => {
    if (currentFamilyId) {
      navigate(`/families/${currentFamilyId}/persons/${person.id}`);
    }
  };

  // 获取性别颜色
  const getGenderColor = (gender: Gender) => {
    switch (gender) {
      case Gender.MALE:
        return 'bg-blue-100 text-blue-600';
      case Gender.FEMALE:
        return 'bg-pink-100 text-pink-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索姓名..."
                className="w-full pl-10 pr-10 py-2 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${
                showFilters ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
              }`}
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>
          </div>

          {/* 过滤器 */}
          {showFilters && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex flex-wrap gap-3">
                {/* 性别过滤 */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">性别:</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setFilters(f => ({ ...f, gender: '' }))}
                      className={`px-3 py-1 rounded-full text-xs ${
                        filters.gender === '' 
                          ? 'bg-gray-800 text-white' 
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      全部
                    </button>
                    <button
                      onClick={() => setFilters(f => ({ ...f, gender: Gender.MALE }))}
                      className={`px-3 py-1 rounded-full text-xs ${
                        filters.gender === Gender.MALE 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-blue-50 text-blue-600'
                      }`}
                    >
                      男
                    </button>
                    <button
                      onClick={() => setFilters(f => ({ ...f, gender: Gender.FEMALE }))}
                      className={`px-3 py-1 rounded-full text-xs ${
                        filters.gender === Gender.FEMALE 
                          ? 'bg-pink-500 text-white' 
                          : 'bg-pink-50 text-pink-600'
                      }`}
                    >
                      女
                    </button>
                  </div>
                </div>

                {/* 代际过滤 */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">代际:</span>
                  <select
                    value={filters.generation}
                    onChange={(e) => setFilters(f => ({ ...f, generation: e.target.value }))}
                    className="px-3 py-1 rounded-full text-xs bg-gray-100 border-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">全部</option>
                    {generations.map(gen => (
                      <option key={gen} value={gen}>第{gen}代</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* 搜索结果 */}
      <main className="max-w-4xl mx-auto px-4 py-4">
        {/* 结果统计 */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">
            找到 <span className="font-medium text-gray-900">{results.length}</span> 位成员
          </p>
        </div>

        {/* 结果列表 */}
        {results.length > 0 ? (
          <div className="space-y-2">
            {results.map((person) => (
              <button
                key={person.id}
                onClick={() => handlePersonClick(person)}
                className="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow text-left"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getGenderColor(person.gender)}`}>
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{person.name}</p>
                    <p className="text-sm text-gray-500">
                      第{person.generation}代 · {person.gender === Gender.MALE ? '男' : person.gender === Gender.FEMALE ? '女' : '未知'}
                    </p>
                  </div>
                  {person.birthDate && (
                    <p className="text-sm text-gray-400">
                      {new Date(person.birthDate).getFullYear()}年
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : query ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500">未找到匹配的成员</p>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500">输入姓名开始搜索</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default SearchPage;
