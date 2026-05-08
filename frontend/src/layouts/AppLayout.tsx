import { useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { SearchBar } from '../components/search/SearchBar';

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hydrateCurrentUser } = useAuthStore();

  useEffect(() => {
    void hydrateCurrentUser();
  }, [hydrateCurrentUser]);

  // Extract familyId from any nested route
  const familyId = location.pathname.match(/\/families\/([^/]+)/)?.[1];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-lg font-bold text-gray-800 hover:text-blue-600 transition-colors">
              族谱系统
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              <NavLink to="/" current={location.pathname === '/'}>
                家族列表
              </NavLink>
              {familyId && (
                <>
                  <NavLink
                    to={`/families/${familyId}`}
                    current={location.pathname === `/families/${familyId}`}
                  >
                    族谱
                  </NavLink>
                  <NavLink
                    to={`/families/${familyId}/search`}
                    current={location.pathname.includes('/search')}
                  >
                    搜索
                  </NavLink>
                  <NavLink
                    to={`/families/${familyId}/import`}
                    current={location.pathname.includes('/import')}
                  >
                    导入
                  </NavLink>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <SearchBar />
            {user ? (
              <>
                <span className="text-sm text-gray-600">{user.display_name || user.username}</span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1"
                >
                  退出
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="text-sm text-blue-600 hover:text-blue-700 px-2 py-1"
              >
                登录
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

function NavLink({ to, current, children }: { to: string; current: boolean; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
        current
          ? 'bg-blue-50 text-blue-700'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
      }`}
    >
      {children}
    </Link>
  );
}
