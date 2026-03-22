import React, { useState, useCallback, useEffect } from 'react';
import { DualFamilyTree } from './tree/DualFamilyTree';
import { MobileTreeView } from './mobile/MobileTreeView';
// PersonDetailPanel 从 PersonDetailPanelAdapter 内部定义使用
import { BottomDrawer } from './BottomDrawer';
import { useViewMode, useIsMobile, useIsTablet, useIsLargeDesktop } from '../hooks/useMediaQuery';
import { useFamilyStore } from '../store/familyStore';
import { Person, ViewMode as AppViewMode } from '../types';
import { Menu, X, ChevronRight, Users, Search, Settings } from 'lucide-react';

interface ResponsiveLayoutProps {
  familyId: string;
  referencePersonId: string;
}

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  familyId,
  referencePersonId,
}) => {
  const viewMode = useViewMode();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isLargeDesktop = useIsLargeDesktop();
  
  const { 
    persons, 
    selectedPersonId, 
    setSelectedPerson, 
    setReferencePerson,
    getPersonById,
  } = useFamilyStore();

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);

  const selectedPerson = selectedPersonId ? getPersonById(selectedPersonId) : null;

  // 处理人员点击
  const handlePersonClick = useCallback((person: Person) => {
    setSelectedPerson(person.id);
    setIsDetailOpen(true);
  }, [setSelectedPerson]);

  // 处理设为参考点
  const handleSetReference = useCallback((personId: string) => {
    setReferencePerson(personId);
    setIsDetailOpen(false);
  }, [setReferencePerson]);

  // 关闭详情面板
  const handleCloseDetail = useCallback(() => {
    setIsDetailOpen(false);
    setSelectedPerson(null);
  }, [setSelectedPerson]);

  // 根据屏幕尺寸渲染不同的布局
  const renderLayout = () => {
    // 移动端 (< 768px): 列表视图
    if (isMobile) {
      return (
        <div className="flex flex-col h-full">
          {/* 顶部导航 */}
          <header className="bg-white shadow-sm px-4 py-3 flex items-center justify-between z-10">
            <button
              onClick={() => setIsNavOpen(true)}
              className="p-2 -ml-2 rounded-lg hover:bg-gray-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-semibold text-lg">双系族谱</h1>
            <button className="p-2 -mr-2 rounded-lg hover:bg-gray-100">
              <Search className="w-5 h-5" />
            </button>
          </header>

          {/* 主内容区 */}
          <main className="flex-1 overflow-hidden">
            <MobileTreeView
              familyId={familyId}
              referencePersonId={referencePersonId}
              onPersonClick={handlePersonClick}
            />
          </main>

          {/* 底部抽屉详情 */}
          <BottomDrawer
            isOpen={isDetailOpen}
            onClose={handleCloseDetail}
            title={selectedPerson?.name || '人员详情'}
          >
            {selectedPerson && (
              <PersonDetailPanelAdapter
                person={selectedPerson}
                onSetReference={() => handleSetReference(selectedPerson.id)}
                onClose={handleCloseDetail}
                compact
              />
            )}
          </BottomDrawer>
        </div>
      );
    }

    // 平板端 (768px - 1280px): 单系树 + 底部抽屉
    if (isTablet) {
      return (
        <div className="flex flex-col h-full">
          {/* 顶部导航 */}
          <header className="bg-white shadow-sm px-4 py-3 flex items-center justify-between z-10">
            <button
              onClick={() => setIsNavOpen(true)}
              className="p-2 -ml-2 rounded-lg hover:bg-gray-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-semibold text-lg">双系族谱</h1>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg hover:bg-gray-100">
                <Search className="w-5 h-5" />
              </button>
              <button className="p-2 -mr-2 rounded-lg hover:bg-gray-100">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* 主内容区 - 简化的树形视图 */}
          <main className="flex-1 overflow-hidden bg-gray-50">
            <div className="h-full p-4">
              <div className="bg-white rounded-xl shadow-sm h-full overflow-hidden">
                <DualFamilyTree
                  familyId={familyId}
                  rootPersonId={referencePersonId}
                  onPersonClick={handlePersonClick}
                  onSetReference={handleSetReference}
                  maxDepth={3}
                />
              </div>
            </div>
          </main>

          {/* 底部抽屉详情 */}
          <BottomDrawer
            isOpen={isDetailOpen}
            onClose={handleCloseDetail}
            title={selectedPerson?.name || '人员详情'}
            height="60vh"
          >
            {selectedPerson && (
              <PersonDetailPanelAdapter
                person={selectedPerson}
                onSetReference={() => handleSetReference(selectedPerson.id)}
                onClose={handleCloseDetail}
              />
            )}
          </BottomDrawer>
        </div>
      );
    }

    // 桌面端 (>= 1280px): 双系树 + 侧边详情面板
    return (
      <div className="flex h-full">
        {/* 侧边导航 */}
        <aside className={`
          bg-white border-r border-gray-200 transition-all duration-300
          ${isNavOpen ? 'w-64' : 'w-16'}
        `}>
          <div className="p-4">
            <button
              onClick={() => setIsNavOpen(!isNavOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 w-full flex items-center justify-center"
            >
              {isNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
          
          <nav className="px-2">
            <NavItem 
              icon={<Users className="w-5 h-5" />} 
              label="家族成员" 
              isOpen={isNavOpen}
              active
            />
            <NavItem 
              icon={<Search className="w-5 h-5" />} 
              label="搜索" 
              isOpen={isNavOpen}
            />
            <NavItem 
              icon={<Settings className="w-5 h-5" />} 
              label="设置" 
              isOpen={isNavOpen}
            />
          </nav>
        </aside>

        {/* 主内容区 */}
        <main className="flex-1 flex overflow-hidden">
          {/* 树形视图 */}
          <div className={`
            flex-1 bg-gray-50 p-4 transition-all duration-300
            ${isDetailOpen && isLargeDesktop ? 'mr-96' : ''}
          `}>
            <div className="bg-white rounded-xl shadow-sm h-full overflow-hidden">
              <DualFamilyTree
                familyId={familyId}
                rootPersonId={referencePersonId}
                onPersonClick={handlePersonClick}
                onSetReference={handleSetReference}
                maxDepth={5}
              />
            </div>
          </div>

          {/* 侧边详情面板 */}
          {isLargeDesktop && (
            <aside className={`
              fixed right-0 top-0 h-full w-96 bg-white shadow-xl border-l border-gray-200
              transition-transform duration-300 z-20
              ${isDetailOpen ? 'translate-x-0' : 'translate-x-full'}
            `}>
              <div className="h-full flex flex-col">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="font-semibold text-lg">人员详情</h2>
                  <button
                    onClick={handleCloseDetail}
                    className="p-2 rounded-lg hover:bg-gray-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-auto p-4">
                  {selectedPerson && (
                    <PersonDetailPanelAdapter
                      person={selectedPerson}
                      onSetReference={() => handleSetReference(selectedPerson.id)}
                      onClose={handleCloseDetail}
                    />
                  )}
                </div>
              </div>
            </aside>
          )}

          {/* 中等屏幕的抽屉 */}
          {!isLargeDesktop && (
            <BottomDrawer
              isOpen={isDetailOpen}
              onClose={handleCloseDetail}
              title={selectedPerson?.name || '人员详情'}
              height="50vh"
            >
              {selectedPerson && (
                <PersonDetailPanelAdapter
                  person={selectedPerson}
                  onSetReference={() => handleSetReference(selectedPerson.id)}
                  onClose={handleCloseDetail}
                />
              )}
            </BottomDrawer>
          )}
        </main>
      </div>
    );
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-100">
      {renderLayout()}
    </div>
  );
};

// 导航项组件
interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  isOpen: boolean;
  active?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, isOpen, active }) => (
  <button
    className={`
      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1
      transition-colors
      ${active 
        ? 'bg-blue-50 text-blue-600' 
        : 'text-gray-600 hover:bg-gray-100'
      }
    `}
  >
    {icon}
    {isOpen && <span className="text-sm font-medium">{label}</span>}
  </button>
);

// 人员详情面板适配器组件
interface PersonDetailPanelAdapterProps {
  person: Person;
  onSetReference: () => void;
  onClose: () => void;
  compact?: boolean;
}

const PersonDetailPanelAdapter: React.FC<PersonDetailPanelAdapterAdapterProps> = ({
  person,
  onSetReference,
  onClose,
  compact = false,
}) => {
  const { getPersonById } = useFamilyStore();

  const father = person.fatherId ? getPersonById(person.fatherId) : null;
  const mother = person.motherId ? getPersonById(person.motherId) : null;
  const spouses = person.spouseIds?.map(id => getPersonById(id)).filter(Boolean) || [];
  const children = person.childrenIds?.map(id => getPersonById(id)).filter(Boolean) || [];

  return (
    <div className="space-y-4">
      {/* 基本信息 */}
      <div className="flex items-start gap-4">
        <div className={`
          rounded-full flex items-center justify-center flex-shrink-0
          ${person.gender === 'MALE'
            ? 'bg-blue-100 text-blue-600'
            : person.gender === 'FEMALE'
              ? 'bg-pink-100 text-pink-600'
              : 'bg-gray-100 text-gray-600'
          }
          ${compact ? 'w-16 h-16' : 'w-20 h-20'}
        `}>
          <Users className={compact ? 'w-8 h-8' : 'w-10 h-10'} />
        </div>
        <div className="flex-1">
          <h3 className={`font-bold text-gray-900 ${compact ? 'text-xl' : 'text-2xl'}`}>
            {person.name}
          </h3>
          <p className="text-gray-500 mt-1">
            第{person.generation}代 · {person.gender === 'MALE' ? '男' : person.gender === 'FEMALE' ? '女' : '未知'}
          </p>
          <p className="text-sm text-gray-400 mt-0.5">
            {person.birthDate && new Date(person.birthDate).getFullYear()}
            {person.deathDate && ` - ${new Date(person.deathDate).getFullYear()}`}
          </p>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <button
          onClick={onSetReference}
          className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
        >
          设为参考点
        </button>
        {!compact && (
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            关闭
          </button>
        )}
      </div>

      {/* 详细信息 */}
      {!compact && (
        <>
          {/* 父母 */}
          <div className="border-t border-gray-200 pt-4">
            <h4 className="font-medium text-gray-700 mb-2">父母</h4>
            <div className="space-y-2">
              {father && (
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-500 w-12">父亲</span>
                  <span className="font-medium">{father.name}</span>
                </div>
              )}
              {mother && (
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-500 w-12">母亲</span>
                  <span className="font-medium">{mother.name}</span>
                </div>
              )}
              {!father && !mother && (
                <p className="text-sm text-gray-400">暂无父母信息</p>
              )}
            </div>
          </div>

          {/* 配偶 */}
          {spouses.length > 0 && (
            <div className="border-t border-gray-200 pt-4">
              <h4 className="font-medium text-gray-700 mb-2">配偶</h4>
              <div className="space-y-2">
                {spouses.map(spouse => spouse && (
                  <div key={spouse.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <span className="font-medium">{spouse.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 子女 */}
          {children.length > 0 && (
            <div className="border-t border-gray-200 pt-4">
              <h4 className="font-medium text-gray-700 mb-2">子女</h4>
              <div className="space-y-2">
                {children.map(child => child && (
                  <div key={child.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <span className="font-medium">{child.name}</span>
                    <span className="text-sm text-gray-500">
                      {child.gender === 'MALE' ? '子' : '女'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 简介 */}
          {person.bio && (
            <div className="border-t border-gray-200 pt-4">
              <h4 className="font-medium text-gray-700 mb-2">简介</h4>
              <p className="text-sm text-gray-600 leading-relaxed">{person.bio}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// 底部抽屉组件
interface BottomDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  height?: string;
}

const BottomDrawer: React.FC<BottomDrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  height = '70vh',
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* 遮罩 */}
      <div 
        className="fixed inset-0 bg-black/30 z-30"
        onClick={onClose}
      />
      
      {/* 抽屉 */}
      <div 
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-40"
        style={{ height, maxHeight: '90vh' }}
      >
        {/* 拖动条 */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>
        
        {/* 头部 */}
        <div className="px-4 pb-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-lg">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* 内容 */}
        <div className="overflow-auto" style={{ height: `calc(${height} - 60px)` }}>
          <div className="p-4">
            {children}
          </div>
        </div>
      </div>
    </>
  );
};

export default ResponsiveLayout;
