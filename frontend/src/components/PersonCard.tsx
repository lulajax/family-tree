/**
 * 双系族谱系统 - 人员卡片组件
 * Dual Family Tree System - Person Card Component
 * 
 * 显示人员基本信息，支持选中状态、参考点标识和右键菜单
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GENDER_LABELS, GENDER_ICONS, SIDE_LABELS } from '../types';
import type { PersonCardProps, Gender, TitleSide } from '../types';

// ============================================
// 样式常量
// ============================================

const styles = {
  card: {
    position: 'relative' as const,
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    overflow: 'hidden',
    userSelect: 'none' as const,
  },
  cardHover: {
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
    transform: 'translateY(-2px)',
  },
  cardSelected: {
    boxShadow: '0 0 0 2px #1890ff, 0 4px 16px rgba(24, 144, 255, 0.2)',
  },
  cardReference: {
    background: 'linear-gradient(135deg, #fff7e6 0%, #fff 100%)',
    boxShadow: '0 0 0 2px #faad14, 0 4px 16px rgba(250, 173, 20, 0.2)',
  },
  referenceBadge: {
    position: 'absolute' as const,
    top: '8px',
    right: '8px',
    backgroundColor: '#faad14',
    color: '#fff',
    fontSize: '10px',
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: '4px',
    zIndex: 1,
  },
  cardNormal: {
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  cardCompact: {
    padding: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  avatar: {
    flexShrink: 0,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    color: '#fff',
    overflow: 'hidden',
  },
  avatarNormal: {
    width: '56px',
    height: '56px',
    fontSize: '20px',
  },
  avatarCompact: {
    width: '40px',
    height: '40px',
    fontSize: '14px',
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
  info: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  name: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#262626',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  nameCompact: {
    fontSize: '14px',
  },
  genderIcon: {
    fontSize: '14px',
    flexShrink: 0,
  },
  genderMale: {
    color: '#1890ff',
  },
  genderFemale: {
    color: '#eb2f96',
  },
  genderUnknown: {
    color: '#8c8c8c',
  },
  title: {
    fontSize: '13px',
    color: '#1890ff',
    fontWeight: 500,
    padding: '2px 8px',
    backgroundColor: '#e6f7ff',
    borderRadius: '4px',
    display: 'inline-block',
  },
  meta: {
    fontSize: '13px',
    color: '#8c8c8c',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  metaCompact: {
    fontSize: '12px',
  },
  bio: {
    fontSize: '13px',
    color: '#595959',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as const,
    lineHeight: 1.5,
  },
  actions: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid #f0f0f0',
  },
  actionButton: {
    padding: '4px 12px',
    fontSize: '12px',
    borderRadius: '4px',
    border: '1px solid #d9d9d9',
    backgroundColor: '#fff',
    color: '#595959',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      borderColor: '#1890ff',
      color: '#1890ff',
    },
  },
  actionButtonPrimary: {
    backgroundColor: '#1890ff',
    borderColor: '#1890ff',
    color: '#fff',
    ':hover': {
      backgroundColor: '#40a9ff',
      borderColor: '#40a9ff',
    },
  },
  // 右键菜单样式
  contextMenu: {
    position: 'absolute' as const,
    backgroundColor: '#fff',
    borderRadius: '6px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    padding: '4px 0',
    minWidth: '160px',
    zIndex: 1000,
  },
  contextMenuItem: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#262626',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    ':hover': {
      backgroundColor: '#f5f5f5',
    },
  },
  contextMenuItemDanger: {
    color: '#ff4d4f',
    ':hover': {
      backgroundColor: '#fff1f0',
    },
  },
  contextMenuDivider: {
    height: '1px',
    backgroundColor: '#f0f0f0',
    margin: '4px 0',
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

const getGenderIconStyle = (gender: Gender) => {
  switch (gender) {
    case 'male':
      return styles.genderMale;
    case 'female':
      return styles.genderFemale;
    default:
      return styles.genderUnknown;
  }
};

const getAvatarText = (name: string) => {
  return name.charAt(0).toUpperCase();
};

const getLifeYears = (person: { birthDate?: string; deathDate?: string }) => {
  const birth = person.birthDate
    ? new Date(person.birthDate).getFullYear()
    : null;
  const death = person.deathDate
    ? new Date(person.deathDate).getFullYear()
    : null;
  
  if (!birth && !death) return null;
  if (birth && death) return `${birth}-${death}`;
  if (birth) return `${birth}-`;
  return `?-${death}`;
};

const getSideLabel = (side?: TitleSide) => {
  if (!side || side === 'self') return null;
  return SIDE_LABELS[side];
};

// ============================================
// 组件
// ============================================

export const PersonCard: React.FC<PersonCardProps> = ({
  person,
  isSelected = false,
  isReference = false,
  title,
  onClick,
  onSetReference,
  compact = false,
  className,
  showActions = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  
  // 处理点击
  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      onClick?.();
    },
    [onClick]
  );
  
  // 处理右键菜单
  const handleContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      setContextMenu({ x: event.clientX, y: event.clientY });
    },
    []
  );
  
  // 关闭右键菜单
  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);
  
  // 点击外部关闭右键菜单
  useEffect(() => {
    if (contextMenu) {
      const handleClickOutside = () => closeContextMenu();
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu, closeContextMenu]);
  
  // 处理设为参考点
  const handleSetReference = useCallback(
    (event?: React.MouseEvent) => {
      event?.stopPropagation();
      onSetReference?.();
      closeContextMenu();
    },
    [onSetReference, closeContextMenu]
  );
  
  const lifeYears = getLifeYears(person);
  const sideLabel = title ? getSideLabel(title as TitleSide) : null;
  
  const cardStyle = {
    ...styles.card,
    ...(compact ? {} : styles.cardNormal),
    ...(isHovered && !isSelected && !isReference ? styles.cardHover : {}),
    ...(isSelected ? styles.cardSelected : {}),
    ...(isReference ? styles.cardReference : {}),
  };
  
  const avatarStyle = {
    ...styles.avatar,
    ...(compact ? styles.avatarCompact : styles.avatarNormal),
    ...getAvatarStyle(person.gender),
  };
  
  return (
    <>
      <div
        ref={cardRef}
        style={cardStyle}
        className={className}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        role="button"
        tabIndex={0}
        aria-label={`${person.name}的信息卡片`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
          }
        }}
      >
        {/* 参考点标识 */}
        {isReference && <span style={styles.referenceBadge}>参考点</span>}
        
        {/* 紧凑模式 */}
        {compact ? (
          <div style={styles.cardCompact}>
            <div style={avatarStyle}>
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
            <div style={styles.info}>
              <div style={styles.header}>
                <span style={{ ...styles.name, ...styles.nameCompact }}>
                  {person.name}
                </span>
                <span
                  style={{
                    ...styles.genderIcon,
                    ...getGenderIconStyle(person.gender),
                  }}
                  aria-label={GENDER_LABELS[person.gender]}
                >
                  {GENDER_ICONS[person.gender]}
                </span>
              </div>
              {(title || lifeYears) && (
                <div style={{ ...styles.meta, ...styles.metaCompact }}>
                  {title && <span style={styles.title}>{title}</span>}
                  {lifeYears && <span>{lifeYears}</span>}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* 标准模式 */
          <div style={styles.cardNormal}>
            <div style={avatarStyle}>
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
            <div style={styles.info}>
              <div style={styles.header}>
                <span style={styles.name}>{person.name}</span>
                <span
                  style={{
                    ...styles.genderIcon,
                    ...getGenderIconStyle(person.gender),
                  }}
                  aria-label={GENDER_LABELS[person.gender]}
                >
                  {GENDER_ICONS[person.gender]}
                </span>
              </div>
              
              {title && (
                <div>
                  <span style={styles.title}>{title}</span>
                </div>
              )}
              
              <div style={styles.meta}>
                {lifeYears && <span>{lifeYears}</span>}
                {sideLabel && (
                  <>
                    <span>·</span>
                    <span>{sideLabel}</span>
                  </>
                )}
              </div>
              
              {person.bio && !compact && (
                <div style={styles.bio}>{person.bio}</div>
              )}
              
              {showActions && onSetReference && !isReference && (
                <div style={styles.actions}>
                  <button
                    type="button"
                    style={styles.actionButton}
                    onClick={handleSetReference}
                  >
                    设为参考点
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* 右键菜单 */}
      {contextMenu && (
        <div
          style={{
            ...styles.contextMenu,
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          {!isReference && onSetReference && (
            <div
              style={styles.contextMenuItem}
              onClick={handleSetReference}
              role="menuitem"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v8M8 12h8" />
              </svg>
              设为参考点
            </div>
          )}
          <div style={styles.contextMenuItem} onClick={handleClick} role="menuitem">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            查看详情
          </div>
        </div>
      )}
    </>
  );
};

// 默认导出
export default PersonCard;
