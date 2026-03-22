import React from 'react';
import { Link } from 'react-router-dom';
import { useFamilyStore } from '../store/familyStore';
import { Users, ChevronRight, Plus, Search } from 'lucide-react';

const FamilyList: React.FC = () => {
  const { families, setCurrentFamily } = useFamilyStore();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">我的家族</h1>
            <p className="text-sm text-gray-500 mt-0.5">选择或创建一个家族</p>
          </div>
          <button className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 搜索栏 */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="搜索家族..."
            className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* 家族列表 */}
      <main className="max-w-4xl mx-auto px-4 pb-8">
        {families.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">还没有家族</h3>
            <p className="text-gray-500 mb-4">创建您的第一个家族族谱</p>
            <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
              创建家族
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {families.map((family) => (
              <Link
                key={family.id}
                to={`/families/${family.id}`}
                onClick={() => setCurrentFamily(family.id)}
                className="block bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Users className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{family.name}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {family.memberCount} 位成员
                    </p>
                    {family.description && (
                      <p className="text-xs text-gray-400 mt-1 truncate">
                        {family.description}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default FamilyList;
