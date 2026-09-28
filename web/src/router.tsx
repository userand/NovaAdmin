import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { lazy, Suspense } from 'react';

import RequireAuth from './components/RequireAuth';
import AppLayout from './components/AppLayout';

const Login = lazy(() => import('./pages/login'));
const Dashboard = lazy(() => import('./pages/dashboard'));
const UserPage = lazy(() => import('./pages/system/user'));
const RolePage = lazy(() => import('./pages/system/role'));
const MenuPage = lazy(() => import('./pages/system/menu'));
const DeptPage = lazy(() => import('./pages/system/dept'));
const DictPage = lazy(() => import('./pages/system/dict'));
const ConfigPage = lazy(() => import('./pages/system/config'));
const NoticePage = lazy(() => import('./pages/system/notice'));
const LoginLogPage = lazy(() => import('./pages/system/log/login-log'));
const OperationLogPage = lazy(() => import('./pages/system/log/operation-log'));
const MemberList = lazy(() => import('./pages/member/list'));
const MemberSetting = lazy(() => import('./pages/member/setting'));
const MemberLog = lazy(() => import('./pages/member/log'));
const Profile = lazy(() => import('./pages/profile'));
const NotFound = lazy(() => import('./pages/404'));

function Lazy({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-[60vh] items-center justify-center">
          <div className="bg-muted h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent opacity-40" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  { path: '/login', element: <Lazy><Login /></Lazy> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <Lazy><Dashboard /></Lazy> },
      { path: 'system/user', element: <Lazy><UserPage /></Lazy> },
      { path: 'system/role', element: <Lazy><RolePage /></Lazy> },
      { path: 'system/menu', element: <Lazy><MenuPage /></Lazy> },
      { path: 'system/dept', element: <Lazy><DeptPage /></Lazy> },
      { path: 'system/dict', element: <Lazy><DictPage /></Lazy> },
      { path: 'system/config', element: <Lazy><ConfigPage /></Lazy> },
      { path: 'system/notice', element: <Lazy><NoticePage /></Lazy> },
      { path: 'system/log/login', element: <Lazy><LoginLogPage /></Lazy> },
      { path: 'system/log/operation', element: <Lazy><OperationLogPage /></Lazy> },
      { path: 'member/list', element: <Lazy><MemberList /></Lazy> },
      { path: 'member/setting', element: <Lazy><MemberSetting /></Lazy> },
      { path: 'member/log', element: <Lazy><MemberLog /></Lazy> },
      { path: 'profile', element: <Lazy><Profile /></Lazy> },
      { path: '*', element: <Lazy><NotFound /></Lazy> },
    ],
  },
]);
