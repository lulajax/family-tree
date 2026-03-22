/**
 * 双系族谱系统 - 参考点切换器组件
 * 
 * 功能：
 * - 显示当前参考点
 * - 快速切换下拉菜单
 * - 最近使用记录
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useGesture } from '@use-gesture/react';
import type { ReferencePointSelectorProps, Person } from '../../types';
import { useAppStore } from '../../store/appStore';
import { useSearchPeople } from '../../hooks/useFamilyData';

// ==================== 模拟数据 ====================

const generateMockPerson = (id: string, name: string, gender: 'male' | 'female' = 'male'): Person => ({
  id,
  name,
  gender,
  birthDate: '1980-01-01',
  generation: 3,
});

// ==================== 辅助组件 ====================

interface PersonOptionProps {
  person: Person;
  isSelected?: boolean;
  isReference?: boolean;
  onClick: () => void;
  subtitle?: string;
}

const PersonOption: React.FC<PersonOptionProps> = ({
  person,
  isSelected = false,
  isReference = false,
  onClick,
  subtitle,
}) => {
  const genderColor = person.gender === 'male' ? 'bg-blue-500' : person.gender === 'female' ? 'bg-pink-500' : 'bg-slate-400';
  
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
        ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}
      `}
    >
      <div className={`w-8 h-8 ${genderColor} rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0`}>
        {person.name.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-800 truncate">{person.name}</span>
          {isReference && (
            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-medium rounded-full">
              当前
            </span>
          )}
        </div>
        {subtitle && <span className="text-xs text-slate-500">{subtitle}</span>}
      </div>
      {isSelected && (
        <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
};

// ==================== 主组件 ====================

export const ReferencePointSelector: React.FC<ReferencePointSelectorProps> = ({
  currentReferenceId,
  recentReferences = [],
  onChange,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // 从store获取最近使用的参考点
  const storedRecentRefs = useAppStore((state) => state.recentReferences);
  const allRecentRefs = [...new Set([...recentReferences, ...storedRecentRefs])].slice(0, 10);
  
  // 搜索人员
  // const { data: searchResults = [], isLoading: isSearching } = useSearchPeople(searchQuery);
  
  // 模拟当前参考点人员
  const currentPerson = generateMockPerson(currentReferenceId, '张三', 'male');
  
  // 模拟最近使用的人员
  const recentPeople = allRecentRefs.map((id, index) => 
    generateMockPerson(id, `人员${index + 1}`, index % 2 === 0 ? 'male' : 'female')
  );
  
  // 模拟搜索结果
  const searchResults = searchQuery.length >= 2 
    ? Array.from({ length: 5 }, (_, i) => 
        generateMockPerson(`search-${i}`, `${searchQuery}结果${i + 1}`, i % 2 === 0 ? 'male' : 'female')
      )
    : [];
  
  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // 聚焦搜索框
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
  // 处理选择
  const handleSelect = useCallback((personId: string) => {
    onChange(personId);
    setIsOpen(false);
    setSearchQuery('');
  }, [onChange]);
  
  // 手势支持
  const bind = useGesture({
    onTap: () => {
      setIsOpen(!isOpen);
    },
  });
  
  const genderColor = currentPerson.gender === 'male' ? 'bg-blue-500' : currentPerson.gender === 'female' ? 'bg-pink-500' : 'bg-slate-400';
  
  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* 触发按钮 */}
      <button
        {...bind()}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl
          hover:border-slate-300 hover:shadow-sm transition-all
          ${isOpen ? 'border-blue-500 ring-2 ring-blue-100' : ''}
        `}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className={`w-10 h-10 ${genderColor} rounded-full flex items-center justify-center text-white font-medium flex-shrink-0`}>
          {currentPerson.name.charAt(0)}
        </div>
        <div className="flex-1 text-left">
          <div className="text-xs text-slate-500">当前参考点</div>
          <div className="font-medium text-slate-800">{currentPerson.name}</div>
        </div>
        <svg 
          className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {/* 下拉菜单 */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {/* 搜索框 */}
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索人员..."
                className="w-full pl-9 pr-4 py-2 bg-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <svg 
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          {/* 内容区域 */}
          <div className="max-h-[400px] overflow-y-auto">
            {/* 搜索结果 */}
            {searchQuery.length >= 2 && (
              <div className="py-2">
                <div className="px-4 py-1.5 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  搜索结果
                </div>
                {searchResults.length > 0 ? (
                  searchResults.map(person => (
                    <PersonOption
                      key={person.id}
                      person={person}
                      isSelected={person.id === currentReferenceId}
                      onClick={() => handleSelect(person.id)}
                    />
                  ))
                ) : (
                  <div className="px-4 py-4 text-center text-sm text-slate-400">
                    未找到匹配的人员
                  </div>
                )}
              </div>
            )}
            
            {/* 最近使用 */}
            {!searchQuery && recentPeople.length > 0 && (
              <div className="py-2 border-b border-slate-100">
                <div className="px-4 py-1.5 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  最近使用
                </div>
                {recentPeople.slice(0, 5).map(person => (
                  <PersonOption
                    key={person.id}
                    person={person}
                    isSelected={person.id === currentReferenceId}
                    isReference={person.id === currentReferenceId}
                    onClick={() => handleSelect(person.id)}
                  />
                ))}
              </div>
            )}
            
            {/* 快捷操作 */}
            {!searchQuery && (
              <div className="py-2">
                <div className="px-4 py-1.5 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  快捷操作
                </div>
                <button
                  onClick={() => {
                    // 打开人员选择器模态框
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <span className="text-slate-700">浏览完整列表</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferencePointSelector;
