import React, { useState } from 'react';
import { Person, Gender, RelationPathNode } from '../../types';
import { ChevronDown, ChevronUp, User, Star } from 'lucide-react';

interface RelationPathCardProps {
  person: Person;
  path: RelationPathNode[];
  isReference?: boolean;
  onClick: () => void;
}

// 获取性别颜色
const getGenderColor = (gender: Gender): string => {
  switch (gender) {
    case Gender.MALE:
      return 'bg-blue-500';
    case Gender.FEMALE:
      return 'bg-pink-500';
    default:
      return 'bg-gray-500';
  }
};

// 获取性别图标颜色
const getGenderIconColor = (gender: Gender): string => {
  switch (gender) {
    case Gender.MALE:
      return 'text-blue-500';
    case Gender.FEMALE:
      return 'text-pink-500';
    default:
      return 'text-gray-500';
  }
};

// 压缩路径显示
const compressPath = (path: RelationPathNode[]): string => {
  if (path.length === 0) return '自己';
  if (path.length === 1) return path[0].relation;

  // 多代关系简化
  const relations = path.map(p => p.relation);
  const key = relations.join('-');

  // 常见多代关系映射
  const complexRelations: Record<string, string> = {
    '父亲-父亲': '祖父',
    '父亲-母亲': '祖母',
    '母亲-父亲': '外祖父',
    '母亲-母亲': '外祖母',
    '儿子-儿子': '孙子',
    '儿子-女儿': '孙女',
    '女儿-儿子': '外孙',
    '女儿-女儿': '外孙女',
    '父亲-兄弟': '伯父/叔父',
    '父亲-姐妹': '姑姑',
    '母亲-兄弟': '舅舅',
    '母亲-姐妹': '姨妈',
    '父亲-父亲-父亲': '曾祖父',
    '父亲-父亲-母亲': '曾祖母',
    '母亲-母亲-父亲': '外曾祖父',
    '母亲-母亲-母亲': '外曾祖母',
  };

  return complexRelations[key] || relations[relations.length - 1];
};

// 格式化生卒年份
const formatLifeYears = (person: Person): string => {
  const birth = person.birthDate 
    ? new Date(person.birthDate).getFullYear() 
    : '?';
  const death = person.deathDate 
    ? new Date(person.deathDate).getFullYear() 
    : '';
  
  return death ? `${birth}-${death}` : `${birth}-`;
};

export const RelationPathCard: React.FC<RelationPathCardProps> = ({
  person,
  path,
  isReference = false,
  onClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const compressedRelation = compressPath(path);
  const hasLongPath = path.length > 1;

  return (
    <div
      onClick={onClick}
      className={`
        relative bg-white rounded-xl shadow-sm border overflow-hidden
        transition-all duration-200 active:scale-[0.98]
        ${isReference 
          ? 'border-amber-400 shadow-amber-100' 
          : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
        }
      `}
    >
      {/* 参考点标记 */}
      {isReference && (
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-amber-100 rounded-full">
          <Star className="w-3 h-3 text-amber-600 fill-amber-600" />
          <span className="text-xs font-medium text-amber-700">参考点</span>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* 头像 */}
          <div className={`
            w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0
            ${getGenderColor(person.gender)}
          `}>
            {person.photoUrl ? (
              <img
                src={person.photoUrl}
                alt={person.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User className="w-6 h-6 text-white" />
            )}
          </div>

          {/* 信息 */}
          <div className="flex-1 min-w-0">
            {/* 姓名和关系 */}
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 truncate">
                {person.name}
              </h3>
              <span className={`
                text-xs px-2 py-0.5 rounded-full font-medium
                ${person.gender === Gender.MALE 
                  ? 'bg-blue-100 text-blue-700' 
                  : person.gender === Gender.FEMALE 
                    ? 'bg-pink-100 text-pink-700' 
                    : 'bg-gray-100 text-gray-700'
                }
              `}>
                {person.gender === Gender.MALE ? '男' : person.gender === Gender.FEMALE ? '女' : '未知'}
              </span>
            </div>

            {/* 关系路径 */}
            <div className="flex items-center gap-1 mb-1">
              <span className="text-sm font-medium text-blue-600">
                {compressedRelation}
              </span>
              {hasLongPath && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                  }}
                  className="p-0.5 rounded hover:bg-gray-100 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              )}
            </div>

            {/* 生卒年份和代际 */}
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>{formatLifeYears(person)}</span>
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              <span>第{person.generation}代</span>
            </div>
          </div>
        </div>

        {/* 展开的路径详情 */}
        {isExpanded && path.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2">关系路径：</p>
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-sm text-gray-700">自己</span>
              {path.map((node, index) => (
                <React.Fragment key={node.person.id}>
                  <span className="text-gray-400">→</span>
                  <span 
                    className={`
                      text-sm px-2 py-0.5 rounded-full
                      ${node.direction === 'up' 
                        ? 'bg-amber-50 text-amber-700' 
                        : node.direction === 'down'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-purple-50 text-purple-700'
                      }
                    `}
                  >
                    {node.relation}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 底部装饰条 */}
      <div className={`
        h-1 w-full
        ${getGenderColor(person.gender)}
      `} />
    </div>
  );
};

export default RelationPathCard;
