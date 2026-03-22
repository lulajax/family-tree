import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Person, Gender } from '../types';
import { useFamilyStore } from '../store/familyStore';
import { ArrowLeft, User, Calendar, Users, MapPin, FileText, Star } from 'lucide-react';

interface PersonDetailProps {
  person: Person;
}

const PersonDetail: React.FC<PersonDetailProps> = ({ person }) => {
  const navigate = useNavigate();
  const { getPersonById, setReferencePerson } = useFamilyStore();

  const father = person.fatherId ? getPersonById(person.fatherId) : null;
  const mother = person.motherId ? getPersonById(person.motherId) : null;
  const spouses = person.spouseIds?.map(id => getPersonById(id)).filter(Boolean) || [];
  const children = person.childrenIds?.map(id => getPersonById(id)).filter(Boolean) || [];

  const handleSetReference = () => {
    setReferencePerson(person.id);
    navigate(-1);
  };

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
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-lg flex-1">人员详情</h1>
          <button
            onClick={handleSetReference}
            className="p-2 rounded-lg hover:bg-amber-50 text-amber-600"
            title="设为参考点"
          >
            <Star className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* 基本信息卡片 */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
          <div className="flex items-start gap-4">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0 ${getGenderColor(person.gender)}`}>
              <User className="w-10 h-10" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">{person.name}</h2>
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getGenderColor(person.gender)}`}>
                  {person.gender === Gender.MALE ? '男' : person.gender === Gender.FEMALE ? '女' : '未知'}
                </span>
                <span className="text-sm text-gray-500">第{person.generation}代</span>
              </div>
            </div>
          </div>

          {/* 生卒信息 */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">出生日期</p>
                <p className="text-sm font-medium">
                  {person.birthDate ? new Date(person.birthDate).toLocaleDateString('zh-CN') : '未知'}
                </p>
              </div>
            </div>
            {person.deathDate && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">逝世日期</p>
                  <p className="text-sm font-medium">
                    {new Date(person.deathDate).toLocaleDateString('zh-CN')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 家族关系 */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-400" />
            家族关系
          </h3>

          {/* 父母 */}
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-2">父母</p>
            <div className="space-y-2">
              {father && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm text-blue-600 w-12">父亲</span>
                  <span className="font-medium">{father.name}</span>
                </div>
              )}
              {mother && (
                <div className="flex items-center gap-3 p-3 bg-pink-50 rounded-lg">
                  <span className="text-sm text-pink-600 w-12">母亲</span>
                  <span className="font-medium">{mother.name}</span>
                </div>
              )}
              {!father && !mother && (
                <p className="text-sm text-gray-400 py-2">暂无父母信息</p>
              )}
            </div>
          </div>

          {/* 配偶 */}
          {spouses.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-2">配偶</p>
              <div className="space-y-2">
                {spouses.map(spouse => spouse && (
                  <div key={spouse.id} className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                    <span className="font-medium">{spouse.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 子女 */}
          {children.length > 0 && (
            <div>
              <p className="text-sm text-gray-500 mb-2">子女</p>
              <div className="space-y-2">
                {children.map(child => child && (
                  <div 
                    key={child.id} 
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      child.gender === Gender.MALE ? 'bg-blue-50' : 'bg-pink-50'
                    }`}
                  >
                    <span className="font-medium">{child.name}</span>
                    <span className={`text-xs ${
                      child.gender === Gender.MALE ? 'text-blue-600' : 'text-pink-600'
                    }`}>
                      {child.gender === Gender.MALE ? '子' : '女'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 简介 */}
        {person.bio && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-400" />
              简介
            </h3>
            <p className="text-gray-600 leading-relaxed">{person.bio}</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default PersonDetail;
