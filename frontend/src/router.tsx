import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { FamilyListPage } from './pages/FamilyListPage';
import { FamilyDashboard } from './pages/FamilyDashboard';
import { LoginPage } from './pages/LoginPage';
import { SearchPage } from './pages/SearchPage';
import { ImportPage } from './pages/ImportPage';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      {
        path: '/',
        element: <FamilyListPage />,
      },
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/families/:familyId',
        element: <FamilyDashboard />,
      },
      {
        path: '/families/:familyId/search',
        element: <SearchPage />,
      },
      {
        path: '/families/:familyId/import',
        element: <ImportPage />,
      },
    ],
  },
]);
