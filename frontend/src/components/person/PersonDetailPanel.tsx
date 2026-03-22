/**
 * 双系族谱系统 - 人员详情面板组件
 * 
 * 功能：
 * - 显示基本信息（姓名、生卒、简介）
 * - 关系列表（父母、配偶、子女）
 * - 称谓计算（相对于当前参考点）
 * - 历史版本时间线
 */

import React, { useState, useCallback } from 'react';
import type { 
  PersonDetailPanelProps, 
  Person, 
  PersonHistory,
  PersonWithRelations 
} from '../../types';
import { useCalculateTitle, usePersonHistory } from '../../hooks/useFamilyData';

// ==================== 样式常量 ====================

const GENDER_COLORS = {
  male: { bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  female: { bg: 'bg-pink-500', light: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
  unknown: { bg: 'bg-slate-400', light: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
} as const;

const GENDER_LABELS = {
  male: '男',
  female: '女',
  unknown: '未知',
} as const;

// ==================== 辅助组件 ====================

interface InfoRowProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value, icon }) => (
  <div className="flex items-start gap-3 py-2">
    {icon && <div className="flex-shrink-0 w-5 h-5 text-slate-400 mt-0.5">{icon}</div>}
    <div className="flex-1">
      <span className="text-xs text-slate-500 block mb-0.5">{label}</span>
      <span className="text-sm text-slate-800">{value || '-'}</span>
    </div>
  </div>
);

interface RelationChipProps {
  person: Person;
  relation: string;
  onClick?: () => void;
}

const RelationChip: React.FC<RelationChipProps> = ({ person, relation, onClick }) => {
  const colors = GENDER_COLORS[person.gender];
  
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg border transition-all
        ${colors.light} ${colors.border} hover:shadow-sm
        ${onClick ? 'cursor-pointer hover:scale-[1.02]' : 'cursor-default'}
      `}
    >
      <div className={`w-6 h-6 ${colors.bg} rounded-full flex items-center justify-center text-white text-xs font-medium`}>
        {person.name.charAt(0)}
      </div>
      <div className="text-left">
        <div className="text-sm font-medium text-slate-800">{person.name}</div>
        <div className={`text-xs ${colors.text}`}>{relation}</div>
      </div>
    </button>
  );
};

interface HistoryTimelineProps {
  history: PersonHistory[];
}

const HistoryTimeline: React.FC<HistoryTimelineProps> = ({ history }) => {
  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <svg className="w-12 h-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm">暂无历史记录</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {history.map((item, index) => (
        <div key={item.id} className="relative pl-6 pb-4 last:pb-0">
          {/* 时间线 */}
          {index < history.length - 1 && (
            <div className="absolute left-2 top-3 bottom-0 w-0.5 bg-slate-200" />
          )}
          <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-sm" />
          
          {/* 内容 */}
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">
                版本 {item.version}
              </span>
              <span className="text-xs text-slate-400">
                {new Date(item.changedAt).toLocaleString('zh-CN')}
              </span>
            </div>
            {item.changedBy && (
              <div className="text-xs text-slate-500 mb-2">
                修改者: {item.changedBy}
              </div>
            )}
            <div className="space-y-1">
              {item.changes.map((change, changeIndex) => (
                <div key={changeIndex} className="text-xs">
                  <span className="text-slate-600">{change.field}:</span>
                  <span className="text-red-500 line-through ml-1">{String(change.oldValue)}</span>
                  <span className="text-slate-400 mx-1">→</span>
                  <span className="text-green-600">{String(change.newValue)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ==================== 模拟数据生成 ====================

const generateMockRelations = (person: Person): PersonWithRelations => {
  const createMockPerson = (id: string, name: string, gender: 'male' | 'female'): Person => ({
    id,
    name,
    gender,
    birthDate: '1950-01-01',
    generation: person.generation - 1,
  });
  
  return {
    ...person,
    father: Math.random() > 0.3 ? createMockPerson('father-1', '父亲', 'male') : undefined,
    mother: Math.random() > 0.3 ? createMockPerson('mother-1', '母亲', 'female') : undefined,
    spouses: Math.random() > 0.5 ? [createMockPerson('spouse-1', '配偶', person.gender === 'male' ? 'female' : 'male')] : [],
    children: Math.random() > 0.5 ? [
      createMockPerson('child-1', '长子', 'male'),
      createMockPerson('child-2', '次女', 'female'),
    ] : [],
    siblings: Math.random() > 0.6 ? [
      createMockPerson('sibling-1', '兄长', 'male'),
      createMockPerson('sibling-2', '妹妹', 'female'),
    ] : [],
  };
};

const generateMockHistory = (personId: string): PersonHistory[] => [
  {
    id: 'hist-1',
    personId,
    version: 1,
    changedAt: '2024-01-15T10:00:00Z',
    changedBy: '管理员',
    changes: [
      { field: '姓名', oldValue: '', newValue: '张三' },
      { field: '出生日期', oldValue: '', newValue: '1950-01-01' },
    ],
  },
  {
    id: 'hist-2',
    personId,
    version: 2,
    changedAt: '2024-02-20T14:30:00Z',
    changedBy: '管理员',
    changes: [
      { field: '简介', oldValue: '', newValue: '家族创始人' },
    ],
  },
  {
    id: 'hist-3',
    personId,
    version: 3,
    changedAt: '2024-03-10T09:15:00Z',
    changedBy: '用户A',
    changes: [
      { field: '出生地点', oldValue: '', newValue: '北京市' },
    ],
  },
];

// ==================== 主组件 ====================

type TabType = 'info' | 'relations' | 'history';

export const PersonDetailPanel: React.FC<PersonDetailPanelProps> = ({
  person,
  currentReferenceId,
  onClose,
  onEdit,
  onSetReference,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('info');
  
  // 获取称谓
  const { data: title } = useCalculateTitle(currentReferenceId, person.id);
  
  // 获取历史版本
  // const { data: history = [] } = usePersonHistory(person.id);
  const history = generateMockHistory(person.id);
  
  // 生成关系数据（实际项目中应从API获取）
  const personWithRelations = generateMockRelations(person);
  
  const colors = GENDER_COLORS[person.gender];
  
  // 格式化日期
  const formatDate = useCallback((dateStr?: string): string => {
    if (!dateStr) return '未知';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  }, []);
  
  // 计算年龄
  const calculateAge = useCallback((birthDate?: string, deathDate?: string): string => {
    if (!birthDate) return '未知';
    const birth = new Date(birthDate);
    const end = deathDate ? new Date(deathDate) : new Date();
    const age = Math.floor((end.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    return `${age}岁`;
  }, []);
  
  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { 
      id: 'info', 
      label: '基本信息', 
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
    },
    { 
      id: 'relations', 
      label: '亲属关系', 
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
    },
    { 
      id: 'history', 
      label: '历史版本', 
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    },
  ];
  
  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* 头部 */}
      <div className={`${colors.light} border-b ${colors.border}`}>
        <div className="flex items-start justify-between p-4">
          <div className="flex items-center gap-4">
            {/* 头像 */}
            <div className={`w-16 h-16 ${colors.bg} rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-md`}>
              {person.name.charAt(0)}
            </div>
            
            {/* 基本信息 */}
            <div>
              <h2 className="text-xl font-bold text-slate-800">{person.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors.light} ${colors.text} border ${colors.border}`}>
                  {GENDER_LABELS[person.gender]}
                </span>
                {title && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                    称谓: {title}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-1">
                {formatDate(person.birthDate)} - {person.deathDate ? formatDate(person.deathDate) : '至今'}
                <span className="mx-2">·</span>
                {calculateAge(person.birthDate, person.deathDate)}
              </p>
            </div>
          </div>
          
          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            aria-label="关闭"
          >
            <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* 操作按钮 */}
        <div className="flex gap-2 px-4 pb-4">
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 border border-slate-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            编辑
          </button>
          <button
            onClick={onSetReference}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            设为参考点
          </button>
        </div>
      </div>
      
      {/* 标签页导航 */}
      <div className="flex border-b border-slate-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors
              ${activeTab === tab.id 
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' 
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
              }
            `}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'info' && (
          <div className="space-y-4">
            {/* 基本信息卡片 */}
            <div className="bg-slate-50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">基本信息</h3>
              <div className="divide-y divide-slate-200">
                <InfoRow 
                  label="姓名" 
                  value={person.name}
                  icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                />
                <InfoRow 
                  label="性别" 
                  value={GENDER_LABELS[person.gender]}
                  icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4a4 4 0 100 8 4 4 0 000-8z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14v7m-3-3h6" /></svg>}
                />
                <InfoRow 
                  label="出生日期" 
                  value={formatDate(person.birthDate)}
                  icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                />
                {person.deathDate && (
                  <InfoRow 
                    label="逝世日期" 
                    value={formatDate(person.deathDate)}
                    icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                  />
                )}
                <InfoRow 
                  label="出生地点" 
                  value={person.birthPlace}
                  icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                />
                <InfoRow 
                  label="代数" 
                  value={`第${person.generation + 1}代`}
                  icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                />
              </div>
            </div>
            
            {/* 简介 */}
            {person.biography && (
              <div className="bg-slate-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">简介</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{person.biography}</p>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'relations' && (
          <div className="space-y-4">
            {/* 父母 */}
            {(personWithRelations.father || personWithRelations.mother) && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">父母</h3>
                <div className="grid grid-cols-2 gap-2">
                  {personWithRelations.father && (
                    <RelationChip person={personWithRelations.father} relation="父亲" />
                  )}
                  {personWithRelations.mother && (
                    <RelationChip person={personWithRelations.mother} relation="母亲" />
                  )}
                </div>
              </div>
            )}
            
            {/* 配偶 */}
            {personWithRelations.spouses && personWithRelations.spouses.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">配偶</h3>
                <div className="flex flex-wrap gap-2">
                  {personWithRelations.spouses.map((spouse, index) => (
                    <RelationChip 
                      key={spouse.id} 
                      person={spouse} 
                      relation={person.gender === 'male' ? '妻子' : '丈夫'} 
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* 子女 */}
            {personWithRelations.children && personWithRelations.children.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">子女</h3>
                <div className="flex flex-wrap gap-2">
                  {personWithRelations.children.map((child, index) => (
                    <RelationChip 
                      key={child.id} 
                      person={child} 
                      relation={child.gender === 'male' ? '儿子' : '女儿'} 
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* 兄弟姐妹 */}
            {personWithRelations.siblings && personWithRelations.siblings.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">兄弟姐妹</h3>
                <div className="flex flex-wrap gap-2">
                  {personWithRelations.siblings.map((sibling, index) => (
                    <RelationChip 
                      key={sibling.id} 
                      person={sibling} 
                      relation={sibling.gender === 'male' ? '兄弟' : '姐妹'} 
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'history' && (
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-4">修改历史</h3>
            <HistoryTimeline history={history} />
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonDetailPanel;
