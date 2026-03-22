/**
 * 双系族谱系统 - 参考点选择器组件
 * Dual Family Tree System - Reference Point Selector Component
 * 
 * 用于切换当前参考点（"我"的位置），支持下拉菜单和最近使用列表
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { usePerson, useFamilyPersons } from '../hooks';
import { useCurrentFamilyId } from '../store';
import type { ReferencePointSelectorProps } from '../types';

// ============================================
// 样式常量
// ============================================

const styles = {
  container: {
    position: 'relative' as const,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    color: '#666',
    whiteSpace: 'nowrap' as const,
  },
  selector: {
    position: 'relative' as const,
    minWidth: '180px',
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    backgroundColor: '#fff',
    border: '1px solid #d9d9d9',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      borderColor: '#40a9ff',
    },
  },
  buttonActive: {
    borderColor: '#40a9ff',
    boxShadow: '0 0 0 2px rgba(24, 144, 255, 0.2)',
  },
  buttonContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    overflow: 'hidden',
  },
  avatar: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: '#1890ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    color: '#fff',
    flexShrink: 0,
  },
  name: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  arrow: {
    width: '0',
    height: '0',
    borderLeft: '4px solid transparent',
    borderRight: '4px solid transparent',
    borderTop: '5px solid #999',
    marginLeft: '8px',
    transition: 'transform 0.2s',
  },
  arrowOpen: {
    transform: 'rotate(180deg)',
  },
  dropdown: {
    position: 'absolute' as const,
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    border: '1px solid #d9d9d9',
    borderRadius: '6px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    zIndex: 1000,
    maxHeight: '320px',
    overflow: 'auto',
  },
  section: {
    padding: '8px 0',
  },
  sectionTitle: {
    padding: '4px 12px',
    fontSize: '12px',
    color: '#999',
    fontWeight: 500,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  option: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#f5f5f5',
    },
  },
  optionSelected: {
    backgroundColor: '#e6f7ff',
    ':hover': {
      backgroundColor: '#e6f7ff',
    },
  },
  optionAvatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: '#1890ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    color: '#fff',
    flexShrink: 0,
  },
  optionInfo: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  optionName: {
    fontSize: '14px',
    color: '#333',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  optionSubtitle: {
    fontSize: '12px',
    color: '#999',
  },
  checkmark: {
    width: '16px',
    height: '16px',
    color: '#1890ff',
    flexShrink: 0,
  },
  divider: {
    height: '1px',
    backgroundColor: '#f0f0f0',
    margin: '4px 12px',
  },
  empty: {
    padding: '16px',
    textAlign: 'center' as const,
    color: '#999',
    fontSize: '14px',
  },
  loading: {
    padding: '16px',
    textAlign: 'center' as const,
    color: '#999',
    fontSize: '14px',
  },
  searchInput: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    border: 'none',
    borderBottom: '1px solid #f0f0f0',
    outline: 'none',
    '::placeholder': {
      color: '#bfbfbf',
    },
  },
};

// ============================================
// 组件
// ============================================

export const ReferencePointSelector: React.FC<ReferencePointSelectorProps> = ({
  currentReferenceId,
  onChange,
  recentReferences = [],
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const familyId = useCurrentFamilyId();
  
  // 获取当前参考点信息
  const { data: currentPerson, isLoading: isLoadingCurrent } = usePerson(currentReferenceId);
  
  // 获取家族所有成员
  const { data: familyPersons, isLoading: isLoadingFamily } = useFamilyPersons(familyId || '');
  
  // 获取最近参考点的详细信息
  const recentPersons = useMemo(() => {
    if (!familyPersons) return [];
    return recentReferences
      .filter((id) => id !== currentReferenceId)
      .map((id) => familyPersons.find((p) => p.id === id))
      .filter(Boolean) as typeof familyPersons;
  }, [recentReferences, currentReferenceId, familyPersons]);
  
  // 过滤后的成员列表
  const filteredPersons = useMemo(() => {
    if (!familyPersons) return [];
    if (!searchQuery.trim()) return familyPersons.filter((p) => p.id !== currentReferenceId);
    
    const query = searchQuery.toLowerCase();
    return familyPersons.filter(
      (p) =>
        p.id !== currentReferenceId &&
        (p.name.toLowerCase().includes(query) ||
          (p.bio && p.bio.toLowerCase().includes(query)))
    );
  }, [familyPersons, searchQuery, currentReferenceId]);
  
  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // 打开下拉菜单时聚焦搜索框
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [isOpen]);
  
  // 处理选项点击
  const handleOptionClick = useCallback(
    (personId: string) => {
      onChange(personId);
      setIsOpen(false);
      setSearchQuery('');
    },
    [onChange]
  );
  
  // 处理键盘导航
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setSearchQuery('');
      }
    },
    []
  );
  
  // 获取头像文字
  const getAvatarText = (name: string) => {
    return name.charAt(0).toUpperCase();
  };
  
  // 获取生卒年份显示
  const getLifeYears = (person: typeof currentPerson) => {
    if (!person) return '';
    const birth = person.birthDate ? new Date(person.birthDate).getFullYear() : '?';
    const death = person.deathDate ? new Date(person.deathDate).getFullYear() : '';
    return death ? `${birth}-${death}` : `${birth}-`;
  };
  
  const isLoading = isLoadingCurrent || isLoadingFamily;
  
  return (
    <div
      ref={containerRef}
      style={styles.container}
      className={className}
      onKeyDown={handleKeyDown}
    >
      <span style={styles.label}>当前参考点：</span>
      
      <div style={styles.selector}>
        {/* 选择按钮 */}
        <button
          type="button"
          style={{
            ...styles.button,
            ...(isOpen ? styles.buttonActive : {}),
          }}
          onClick={() => setIsOpen(!isOpen)}
          disabled={isLoading}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label="选择参考点"
        >
          <span style={styles.buttonContent}>
            {isLoading ? (
              <span>加载中...</span>
            ) : currentPerson ? (
              <>
                <span style={styles.avatar}>
                  {currentPerson.avatar ? (
                    <img
                      src={currentPerson.avatar}
                      alt=""
                      style={{ width: '100%', height: '100%', borderRadius: '50%' }}
                    />
                  ) : (
                    getAvatarText(currentPerson.name)
                  )}
                </span>
                <span style={styles.name}>{currentPerson.name}</span>
              </>
            ) : (
              <span style={{ color: '#999' }}>请选择参考点</span>
            )}
          </span>
          <span
            style={{
              ...styles.arrow,
              ...(isOpen ? styles.arrowOpen : {}),
            }}
          />
        </button>
        
        {/* 下拉菜单 */}
        {isOpen && (
          <div
            style={styles.dropdown}
            role="listbox"
            aria-label="参考点列表"
          >
            {/* 搜索框 */}
            <input
              ref={searchInputRef}
              type="text"
              placeholder="搜索成员..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
              aria-label="搜索成员"
            />
            
            {/* 最近使用 */}
            {!searchQuery && recentPersons.length > 0 && (
              <div style={styles.section}>
                <div style={styles.sectionTitle}>最近使用</div>
                {recentPersons.slice(0, 5).map((person) => (
                  <div
                    key={person.id}
                    style={styles.option}
                    onClick={() => handleOptionClick(person.id)}
                    role="option"
                    aria-selected={person.id === currentReferenceId}
                  >
                    <span style={styles.optionAvatar}>
                      {person.avatar ? (
                        <img
                          src={person.avatar}
                          alt=""
                          style={{ width: '100%', height: '100%', borderRadius: '50%' }}
                        />
                      ) : (
                        getAvatarText(person.name)
                      )}
                    </span>
                    <span style={styles.optionInfo}>
                      <span style={styles.optionName}>{person.name}</span>
                      <span style={styles.optionSubtitle}>{getLifeYears(person)}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            {/* 分隔线 */}
            {!searchQuery && recentPersons.length > 0 && filteredPersons.length > 0 && (
              <div style={styles.divider} />
            )}
            
            {/* 所有成员 */}
            <div style={styles.section}>
              {!searchQuery && <div style={styles.sectionTitle}>所有成员</div>}
              {filteredPersons.length === 0 ? (
                <div style={styles.empty}>未找到匹配的成员</div>
              ) : (
                filteredPersons.map((person) => (
                  <div
                    key={person.id}
                    style={{
                      ...styles.option,
                      ...(person.id === currentReferenceId ? styles.optionSelected : {}),
                    }}
                    onClick={() => handleOptionClick(person.id)}
                    role="option"
                    aria-selected={person.id === currentReferenceId}
                  >
                    <span style={styles.optionAvatar}>
                      {person.avatar ? (
                        <img
                          src={person.avatar}
                          alt=""
                          style={{ width: '100%', height: '100%', borderRadius: '50%' }}
                        />
                      ) : (
                        getAvatarText(person.name)
                      )}
                    </span>
                    <span style={styles.optionInfo}>
                      <span style={styles.optionName}>{person.name}</span>
                      <span style={styles.optionSubtitle}>{getLifeYears(person)}</span>
                    </span>
                    {person.id === currentReferenceId && (
                      <svg
                        style={styles.checkmark}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 默认导出
export default ReferencePointSelector;
