import { Navigate, Route, Routes } from 'react-router-dom'

import 'leaflet/dist/leaflet.css'

import { ProtectedRoute } from './routes/ProtectedRoute'
import { RoleRoute } from './routes/RoleRoute'
import { AppShell } from './components/layout/AppShell'

import { AuthLayout } from './pages/auth/AuthLayout'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'

import DashboardPage from './pages/app/DashboardPage'
import NotFoundPage from './pages/NotFoundPage'

// Admin
import UsersPage from './pages/admin/UsersPage'
import ZonesPage from './pages/admin/ZonesPage'
import HouseholdsPage from './pages/admin/HouseholdsPage'
import BinsPage from './pages/admin/BinsPage'
import VirtualBinsPage from './pages/admin/VirtualBinsPage'
import VehiclesPage from './pages/admin/VehiclesPage'
import AdminBillingPlansPage from './pages/admin/BillingPlansPage'
import MembershipPlansPage from './pages/admin/MembershipPlansPage'
import RewardRatesPage from './pages/admin/RewardRatesPage'
import TelemetryPage from './pages/admin/TelemetryPage'

// Ops
import CasesPage from './pages/ops/CasesPage'
import TasksPage from './pages/ops/TasksPage'
import RoutesPage from './pages/ops/RoutesPage'
import DigitalTwinPage from './pages/ops/DigitalTwinPage'
import RewardClaimsPage from './pages/ops/RewardClaimsPage'
import BillingGeneratePage from './pages/ops/BillingGeneratePage'

// Crew
import TodayRoutePage from './pages/crew/TodayRoutePage'
import CrewTasksPage from './pages/crew/CrewTasksPage'
import RecyclablesReviewPage from './pages/crew/RecyclablesReviewPage'
import ExceptionsLogPage from './pages/crew/ExceptionsLogPage'

// Citizen
import WalletPage from './pages/citizen/WalletPage'
import InvoicesPage from './pages/citizen/InvoicesPage'
import CitizenBillingPlansPage from './pages/citizen/BillingPlansPage'
import MembershipPage from './pages/citizen/MembershipPage'
import LitterReportPage from './pages/citizen/LitterReportPage'
import BulkyRequestPage from './pages/citizen/BulkyRequestPage'
import MyCasesPage from './pages/citizen/MyCasesPage'
import RewardClaimPage from './pages/citizen/RewardClaimPage'
import RecyclablesPage from './pages/citizen/RecyclablesPage'
import NotificationsPage from './pages/citizen/NotificationsPage'
import HouseholdSettingsPage from './pages/citizen/HouseholdSettingsPage'
import CollectionSchedulePage from './pages/citizen/CollectionSchedulePage'
import MissedPickupPage from './pages/citizen/MissedPickupPage'

// Billing redirect pages (public routes)
import BillingSuccessPage from './pages/citizen/BillingSuccessPage'
import BillingPendingPage from './pages/citizen/BillingPendingPage'
import BillingFailedPage from './pages/citizen/BillingFailedPage'


export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app" replace />} />

      {/* ✅ Payment redirect pages (must be top-level, not under /app) */}
      <Route path="/billing/success" element={<BillingSuccessPage />} />
      <Route path="/billing/pending" element={<BillingPendingPage />} />
      <Route path="/billing/failed" element={<BillingFailedPage />} />

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<AppShell />}>
          <Route index element={<DashboardPage />} />

          <Route element={<RoleRoute roles={['ADMIN']} />}>
            <Route path="admin/users" element={<UsersPage />} />
            <Route path="admin/zones" element={<ZonesPage />} />
            <Route path="admin/households" element={<HouseholdsPage />} />
            <Route path="admin/bins" element={<BinsPage />} />
            <Route path="admin/virtual-bins" element={<VirtualBinsPage />} />
            <Route path="admin/vehicles" element={<VehiclesPage />} />
            <Route path="admin/billing-plans" element={<AdminBillingPlansPage />} />
            <Route path="admin/membership-plans" element={<MembershipPlansPage />} />
            <Route path="admin/reward-rates" element={<RewardRatesPage />} />
            <Route path="admin/telemetry" element={<TelemetryPage />} />
          </Route>

          <Route element={<RoleRoute roles={['ADMIN', 'SUPERVISOR']} />}>
            <Route path="ops/cases" element={<CasesPage />} />
            <Route path="ops/tasks" element={<TasksPage />} />
            <Route path="ops/routes" element={<RoutesPage />} />
            <Route path="ops/digital-twin" element={<DigitalTwinPage />} />
            <Route path="ops/reward-claims" element={<RewardClaimsPage />} />
            <Route path="ops/billing" element={<BillingGeneratePage />} />
          </Route>

          <Route element={<RoleRoute roles={['CREW']} />}>
            <Route path="crew/today" element={<TodayRoutePage />} />
            <Route path="crew/tasks" element={<CrewTasksPage />} />
            <Route path="crew/recyclables" element={<RecyclablesReviewPage />} />
            <Route path="crew/exceptions" element={<ExceptionsLogPage />} />
          </Route>

          <Route element={<RoleRoute roles={['CITIZEN']} />}>
            <Route path="citizen/wallet" element={<WalletPage />} />
            <Route path="citizen/invoices" element={<InvoicesPage />} />
            <Route path="citizen/billing-plans" element={<CitizenBillingPlansPage />} />
            <Route path="citizen/household-settings" element={<HouseholdSettingsPage />} />
            <Route path="citizen/schedule" element={<CollectionSchedulePage />} />
            <Route path="citizen/membership" element={<MembershipPage />} />
            <Route path="citizen/litter-report" element={<LitterReportPage />} />
            <Route path="citizen/bulky-request" element={<BulkyRequestPage />} />
            <Route path="citizen/missed-pickup" element={<MissedPickupPage />} />
            <Route path="citizen/my-cases" element={<MyCasesPage />} />
            <Route path="citizen/reward-claim" element={<RewardClaimPage />} />
            <Route path="citizen/recyclables" element={<RecyclablesPage />} />
            <Route path="citizen/notifications" element={<NotificationsPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
