/**
 * 双系族谱系统 - 人员详情面板组件
 * Dual Family Tree System - Person Detail Panel Component
 * 
 * 显示人员详细信息，包括基本信息、关系、时间线等
 */

import React, { useState, useCallback } from 'react';
import { usePerson, usePersonRelationships, useCalculateTitle } from '../hooks';
import { useReferencePersonId } from '../store';
import { GENDER_LABELS, RELATIONSHIP_TYPE_LABELS, RELATIONSHIP_SUBTYPE_LABELS } from '../types';
import type { PersonDetailPanelProps, RelationshipType, Gender } from '../types';

// ============================================
// 样式常量
// ============================================

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
    opacity: 0,
    visibility: 'hidden' as const,
    transition: 'all 0.3s ease',
  },
  overlayVisible: {
    opacity: 1,
    visibility: 'visible' as const,
  },
  panel: {
    position: 'fixed' as const,
    top: 0,
    right: 0,
    width: '100%',
    maxWidth: '480px',
    height: '100vh',
    backgroundColor: '#fff',
    boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.15)',
    zIndex: 1000,
    transform: 'translateX(100%)',
    transition: 'transform 0.3s ease',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
  panelVisible: {
    transform: 'translateX(0)',
  },
  // 移动端适配
  '@media (max-width: 480px)': {
    panel: {
      maxWidth: '100%',
    },
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #f0f0f0',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#262626',
  },
  closeButton: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    color: '#8c8c8c',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#f5f5f5',
      color: '#262626',
    },
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '20px',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '200px',
    color: '#8c8c8c',
  },
  error: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: '200px',
    color: '#ff4d4f',
    gap: '12px',
  },
  // 个人信息头部
  profileHeader: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '20px 0',
    borderBottom: '1px solid #f0f0f0',
    marginBottom: '20px',
  },
  avatar: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '36px',
    fontWeight: 600,
    color: '#fff',
    marginBottom: '16px',
    overflow: 'hidden',
  },
  avatarMale: {
    background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
  },
  avatarFemale: {
    background: 'linear-gradient(135deg, #eb2f96 0%, #c41d7f 100%)',
  },
  avatarUnknown: {
    background: 'linear-gradient(135deg, #8c8c8c 0%, #595959 100%)',
  },
  name: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#262626',
    marginBottom: '8px',
  },
  title: {
    fontSize: '14px',
    color: '#1890ff',
    fontWeight: 500,
    padding: '4px 12px',
    backgroundColor: '#e6f7ff',
    borderRadius: '16px',
    marginBottom: '8px',
  },
  gender: {
    fontSize: '14px',
    color: '#8c8c8c',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  // 信息区块
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#262626',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px solid #f0f0f0',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  infoLabel: {
    fontSize: '12px',
    color: '#8c8c8c',
  },
  infoValue: {
    fontSize: '14px',
    color: '#262626',
    fontWeight: 500,
  },
  infoEmpty: {
    fontSize: '14px',
    color: '#bfbfbf',
    fontStyle: 'italic' as const,
  },
  // 简介
  bio: {
    fontSize: '14px',
    color: '#595959',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap' as const,
  },
  // 关系列表
  relationshipList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  relationshipItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#fafafa',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#f0f0f0',
    },
  },
  relationshipAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 600,
    color: '#fff',
    flexShrink: 0,
  },
  relationshipInfo: {
    flex: 1,
    minWidth: 0,
  },
  relationshipName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#262626',
  },
  relationshipType: {
    fontSize: '12px',
    color: '#8c8c8c',
  },
  // 底部操作栏
  footer: {
    padding: '16px 20px',
    borderTop: '1px solid #f0f0f0',
    backgroundColor: '#fff',
    display: 'flex',
    gap: '12px',
  },
  button: {
    flex: 1,
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: 500,
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: '1px solid #d9d9d9',
    backgroundColor: '#fff',
    color: '#595959',
    ':hover': {
      borderColor: '#1890ff',
      color: '#1890ff',
    },
  },
  buttonPrimary: {
    backgroundColor: '#1890ff',
    borderColor: '#1890ff',
    color: '#fff',
    ':hover': {
      backgroundColor: '#40a9ff',
      borderColor: '#40a9ff',
    },
  },
  // 标签页
  tabs: {
    display: 'flex',
    gap: '4px',
    marginBottom: '20px',
    borderBottom: '1px solid #f0f0f0',
  },
  tab: {
    padding: '10px 16px',
    fontSize: '14px',
    color: '#595959',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    transition: 'all 0.2s',
    marginBottom: '-1px',
  },
  tabActive: {
    color: '#1890ff',
    borderBottomColor: '#1890ff',
    fontWeight: 500,
  },
};

// ============================================
// 辅助函数
// ============================================

const getAvatarStyle = (gender: Gender) => {
  switch (gender) {
    case 'male':
      return styles.avatarMale;
    case 'female':
      return styles.avatarFemale;
    default:
      return styles.avatarUnknown;
  }
};

const getAvatarText = (name: string) => {
  return name.charAt(0).toUpperCase();
};

const formatDate = (dateString?: string) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const getRelationshipAvatarStyle = (gender: Gender) => {
  switch (gender) {
    case 'male':
      return { backgroundColor: '#1890ff' };
    case 'female':
      return { backgroundColor: '#eb2f96' };
    default:
      return { backgroundColor: '#8c8c8c' };
  }
};

// ============================================
// 组件
// ============================================

type TabType = 'info' | 'relationships' | 'timeline';

export const PersonDetailPanel: React.FC<PersonDetailPanelProps> = ({
  personId,
  onClose,
  onSetReference,
  className,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [isVisible, setIsVisible] = useState(false);
  
  const referenceId = useReferencePersonId();
  
  // 获取人员信息
  const {
    data: person,
    isLoading: isLoadingPerson,
    error: personError,
  } = usePerson(personId);
  
  // 获取关系信息
  const {
    data: relationships,
    isLoading: isLoadingRelationships,
  } = usePersonRelationships(personId);
  
  // 获取称谓
  const {
    data: titleResult,
    isLoading: isLoadingTitle,
  } = useCalculateTitle(referenceId || '', personId);
  
  // 动画效果
  React.useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);
  
  // 处理关闭
  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);
  
  // 处理设为参考点
  const handleSetReference = useCallback(() => {
    onSetReference?.(personId);
    handleClose();
  }, [onSetReference, personId, handleClose]);
  
  // 处理遮罩层点击
  const handleOverlayClick = useCallback(
    (event: React.MouseEvent) => {
      if (event.target === event.currentTarget) {
        handleClose();
      }
    },
    [handleClose]
  );
  
  // 按类型分组关系
  const groupedRelationships = React.useMemo(() => {
    if (!relationships) return {};
    
    const groups: Record<RelationshipType, typeof relationships> = {
      parent: [],
      spouse: [],
      sibling: [],
    };
    
    relationships.forEach((rel) => {
      groups[rel.type].push(rel);
    });
    
    return groups;
  }, [relationships]);
  
  const isLoading = isLoadingPerson || isLoadingTitle;
  const isReference = referenceId === personId;
  
  return (
    <>
      {/* 遮罩层 */}
      <div
        style={{
          ...styles.overlay,
          ...(isVisible ? styles.overlayVisible : {}),
        }}
        onClick={handleOverlayClick}
        aria-hidden="true"
      />
      
      {/* 面板 */}
      <div
        style={{
          ...styles.panel,
          ...(isVisible ? styles.panelVisible : {}),
        }}
        className={className}
        role="dialog"
        aria-modal="true"
        aria-labelledby="person-detail-title"
      >
        {/* 头部 */}
        <div style={styles.header}>
          <h2 id="person-detail-title" style={styles.headerTitle}>
            人员详情
          </h2>
          <button
            type="button"
            style={styles.closeButton}
            onClick={handleClose}
            aria-label="关闭"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        
        {/* 内容 */}
        <div style={styles.content}>
          {isLoading ? (
            <div style={styles.loading}>加载中...</div>
          ) : personError ? (
            <div style={styles.error}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>加载失败，请稍后重试</span>
            </div>
          ) : person ? (
            <>
              {/* 个人信息头部 */}
              <div style={styles.profileHeader}>
                <div
                  style={{
                    ...styles.avatar,
                    ...getAvatarStyle(person.gender),
                  }}
                >
                  {person.avatar ? (
                    <img
                      src={person.avatar}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    getAvatarText(person.name)
                  )}
                </div>
                <h3 style={styles.name}>{person.name}</h3>
                {titleResult && !isReference && (
                  <span style={styles.title}>{titleResult.title}</span>
                )}
                <div style={styles.gender}>
                  <span>{GENDER_LABELS[person.gender]}</span>
                </div>
              </div>
              
              {/* 标签页 */}
              <div style={styles.tabs} role="tablist">
                <button
                  type="button"
                  style={{
                    ...styles.tab,
                    ...(activeTab === 'info' ? styles.tabActive : {}),
                  }}
                  onClick={() => setActiveTab('info')}
                  role="tab"
                  aria-selected={activeTab === 'info'}
                >
                  基本信息
                </button>
                <button
                  type="button"
                  style={{
                    ...styles.tab,
                    ...(activeTab === 'relationships' ? styles.tabActive : {}),
                  }}
                  onClick={() => setActiveTab('relationships')}
                  role="tab"
                  aria-selected={activeTab === 'relationships'}
                >
                  关系
                  {relationships && (
                    <span style={{ marginLeft: '4px', color: '#8c8c8c' }}>
                      ({relationships.length})
                    </span>
                  )}
                </button>
              </div>
              
              {/* 基本信息标签页 */}
              {activeTab === 'info' && (
                <>
                  {/* 基本信息 */}
                  <div style={styles.section}>
                    <h4 style={styles.sectionTitle}>基本信息</h4>
                    <div style={styles.infoGrid}>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>出生日期</span>
                        <span style={formatDate(person.birthDate) ? styles.infoValue : styles.infoEmpty}>
                          {formatDate(person.birthDate) || '未知'}
                        </span>
                      </div>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>出生地点</span>
                        <span style={person.birthPlace ? styles.infoValue : styles.infoEmpty}>
                          {person.birthPlace || '未知'}
                        </span>
                      </div>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>逝世日期</span>
                        <span style={formatDate(person.deathDate) ? styles.infoValue : styles.infoEmpty}>
                          {formatDate(person.deathDate) || '未逝世'}
                        </span>
                      </div>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>逝世地点</span>
                        <span style={person.deathPlace ? styles.infoValue : styles.infoEmpty}>
                          {person.deathPlace || '-'}
                        </span>
                      </div>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>职业</span>
                        <span style={person.occupation ? styles.infoValue : styles.infoEmpty}>
                          {person.occupation || '未知'}
                        </span>
                      </div>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>教育</span>
                        <span style={person.education ? styles.infoValue : styles.infoEmpty}>
                          {person.education || '未知'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* 联系方式 */}
                  {(person.email || person.phone || person.address) && (
                    <div style={styles.section}>
                      <h4 style={styles.sectionTitle}>联系方式</h4>
                      <div style={styles.infoGrid}>
                        {person.email && (
                          <div style={styles.infoItem}>
                            <span style={styles.infoLabel}>邮箱</span>
                            <span style={styles.infoValue}>{person.email}</span>
                          </div>
                        )}
                        {person.phone && (
                          <div style={styles.infoItem}>
                            <span style={styles.infoLabel}>电话</span>
                            <span style={styles.infoValue}>{person.phone}</span>
                          </div>
                        )}
                        {person.address && (
                          <div style={{ ...styles.infoItem, gridColumn: 'span 2' }}>
                            <span style={styles.infoLabel}>地址</span>
                            <span style={styles.infoValue}>{person.address}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* 简介 */}
                  {person.bio && (
                    <div style={styles.section}>
                      <h4 style={styles.sectionTitle}>简介</h4>
                      <p style={styles.bio}>{person.bio}</p>
                    </div>
                  )}
                </>
              )}
              
              {/* 关系标签页 */}
              {activeTab === 'relationships' && (
                <div style={styles.section}>
                  {isLoadingRelationships ? (
                    <div style={styles.loading}>加载关系中...</div>
                  ) : relationships && relationships.length > 0 ? (
                    <div style={styles.relationshipList}>
                      {(['parent', 'spouse', 'sibling'] as const).map((type) =>
                        groupedRelationships[type]?.length > 0 ? (
                          <div key={type}>
                            <h4 style={styles.sectionTitle}>
                              {RELATIONSHIP_TYPE_LABELS[type]}
                            </h4>
                            {groupedRelationships[type].map((rel) => (
                              <div
                                key={rel.id}
                                style={styles.relationshipItem}
                                role="button"
                                tabIndex={0}
                              >
                                <div
                                  style={{
                                    ...styles.relationshipAvatar,
                                    ...getRelationshipAvatarStyle('unknown'),
                                  }}
                                >
                                  ?
                                </div>
                                <div style={styles.relationshipInfo}>
                                  <div style={styles.relationshipName}>
                                    {rel.toPersonId === personId
                                      ? rel.fromPersonId
                                      : rel.toPersonId}
                                  </div>
                                  <div style={styles.relationshipType}>
                                    {RELATIONSHIP_SUBTYPE_LABELS[rel.subtype]}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null
                      )}
                    </div>
                  ) : (
                    <div style={{ ...styles.loading, color: '#8c8c8c' }}>
                      暂无关系记录
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>
        
        {/* 底部操作栏 */}
        {person && (
          <div style={styles.footer}>
            {!isReference && onSetReference && (
              <button
                type="button"
                style={{ ...styles.button, ...styles.buttonPrimary }}
                onClick={handleSetReference}
              >
                设为参考点
              </button>
            )}
            <button type="button" style={styles.button} onClick={handleClose}>
              关闭
            </button>
          </div>
        )}
      </div>
    </>
  );
};

// 默认导出
export default PersonDetailPanel;
