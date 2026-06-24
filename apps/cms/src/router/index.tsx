import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'

import { FullPageLoader } from '@/components/common/FullPageLoader'
import AppLayout from '@/components/layout/AppLayout'
import AppInstanceConfigPage from '@/features/apps/pages/AppInstanceConfigPage'
import AppInstancesPage from '@/features/apps/pages/AppInstancesPage'
import AppsPage from '@/features/apps/pages/AppsPage'
import { ProtectedLayout } from '@/features/auth/components/ProtectedLayout'
import DashboardPage from '@/features/dashboard/pages/DashboardPage'
import FaqPage from '@/features/faq/pages/FaqPage'
import MediaPage from '@/features/media/pages/MediaPage'
import CreateOrganizationPage from '@/features/organizations/pages/CreateOrganizationPage'
import PlaylistPage from '@/features/playlists/pages/PlaylistPage'
import PlaylistsPage from '@/features/playlists/pages/PlaylistsPage'
import ScreenPage from '@/features/screens/pages/ScreenPage'
import ScreensPage from '@/features/screens/pages/ScreensPage'
import SettingsPage from '@/features/settings/pages/SettingsPage'
import { SuperAdminGate } from '@/features/super-admin/components/SuperAdminGate'
import SuperAdminPage from '@/features/super-admin/pages/SuperAdminPage'
import UsersPage from '@/features/users/pages/UsersPage'

const SchedulesPage = lazy(() => import('@/features/schedules/pages/SchedulesPage'))
const ScheduleEditorPage = lazy(
  () => import('@/features/schedules/pages/ScheduleEditorPage'),
)
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'))
const GoogleCallbackPage = lazy(() => import('@/features/auth/pages/GoogleCallbackPage'))
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage'))
const AcceptInvitePage = lazy(() => import('@/features/auth/pages/AcceptInvitePage'))
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('@/features/auth/pages/ResetPasswordPage'))
const CheckEmailPage = lazy(() => import('@/features/auth/pages/CheckEmailPage'))
const VerifyEmailPage = lazy(() => import('@/features/auth/pages/VerifyEmailPage'))

function PublicPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<FullPageLoader />}>{children}</Suspense>
}

export const router = createBrowserRouter([
  {
    element: <Outlet />,
    children: [
      {
        path: '/login',
        element: (
          <PublicPage>
            <LoginPage />
          </PublicPage>
        ),
      },
      {
        path: '/accept-invite',
        element: (
          <PublicPage>
            <AcceptInvitePage />
          </PublicPage>
        ),
      },
      {
        path: '/register',
        element: (
          <PublicPage>
            <RegisterPage />
          </PublicPage>
        ),
      },
      {
        path: '/forgot-password',
        element: (
          <PublicPage>
            <ForgotPasswordPage />
          </PublicPage>
        ),
      },
      {
        path: '/reset-password',
        element: (
          <PublicPage>
            <ResetPasswordPage />
          </PublicPage>
        ),
      },
      {
        path: '/check-email',
        element: (
          <PublicPage>
            <CheckEmailPage />
          </PublicPage>
        ),
      },
      {
        path: '/verify-email',
        element: (
          <PublicPage>
            <VerifyEmailPage />
          </PublicPage>
        ),
      },
      {
        path: '/auth/google/callback',
        element: (
          <PublicPage>
            <GoogleCallbackPage />
          </PublicPage>
        ),
      },
      {
        element: <ProtectedLayout />,
        children: [
          {
            path: '/create-organization',
            element: <CreateOrganizationPage />,
          },
          {
            element: <AppLayout />,
            children: [
              {
                path: '/dashboard',
                element: <DashboardPage />,
                handle: { breadcrumb: { labelKey: 'layout.dashboard' } },
              },
              {
                path: '/screens',
                element: <ScreensPage />,
                handle: { breadcrumb: { labelKey: 'layout.screens' } },
              },
              { path: '/screens/:screenId', element: <ScreenPage /> },
              {
                path: '/playlists',
                element: <PlaylistsPage />,
                handle: { breadcrumb: { labelKey: 'layout.playlists' } },
              },
              { path: '/playlists/:playlistId', element: <PlaylistPage /> },
              {
                path: '/schedules',
                element: (
                  <PublicPage>
                    <SchedulesPage />
                  </PublicPage>
                ),
                handle: { breadcrumb: { labelKey: 'layout.schedules' } },
              },
              {
                path: '/schedules/new',
                element: (
                  <PublicPage>
                    <ScheduleEditorPage />
                  </PublicPage>
                ),
              },
              {
                path: '/schedules/:scheduleId',
                element: (
                  <PublicPage>
                    <ScheduleEditorPage />
                  </PublicPage>
                ),
              },
              {
                path: '/media',
                element: <MediaPage />,
                handle: { breadcrumb: { labelKey: 'layout.media' } },
              },
              {
                path: '/apps',
                element: <AppsPage />,
                handle: { breadcrumb: { labelKey: 'layout.apps' } },
              },
              { path: '/apps/:appId/instances', element: <AppInstancesPage /> },
              {
                path: '/apps/:appId/instances/:instanceId',
                element: <AppInstanceConfigPage />,
              },
              {
                path: '/settings',
                element: <SettingsPage />,
                handle: { breadcrumb: { labelKey: 'layout.settings' } },
              },
              {
                path: '/faq',
                element: <FaqPage />,
                handle: { breadcrumb: { labelKey: 'layout.faq' } },
              },
              {
                path: '/users',
                element: <UsersPage />,
                handle: { breadcrumb: { labelKey: 'layout.users' } },
              },
              {
                path: '/super-admin',
                element: (
                  <SuperAdminGate>
                    <SuperAdminPage />
                  </SuperAdminGate>
                ),
                handle: { breadcrumb: { labelKey: 'layout.superAdmin' } },
              },
            ],
          },
        ],
      },
      { path: '*', element: <Navigate to="/login" replace /> },
    ],
  },
])
