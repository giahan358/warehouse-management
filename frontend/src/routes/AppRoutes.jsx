import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import RoleRoute from './RoleRoute'
import { ROLES } from '../constants/roles'
import { useAuth } from '../contexts/AuthContext'
import MainLayout from '../layouts/MainLayout'
import AuthLayout from '../layouts/AuthLayout'
import LoginPage from '../pages/auth/LoginPage'
import AdminDashboard from '../pages/dashboard/AdminDashboard'
import StaffDashboard from '../pages/dashboard/StaffDashboard'
import CustomerListPage from '../pages/customers/CustomerListPage'
import InventoryPage from '../pages/inventory/InventoryPage'
import StaffInventoryPage from '../pages/inventory/StaffInventoryPage'
import InboundListPage from '../pages/inbound/InboundListPage'
import StaffInboundSchedulePage from '../pages/inbound/StaffInboundSchedulePage'
import StaffCountingListPage from '../pages/inbound/StaffCountingListPage'
import InboundDetailPage from '../pages/inbound/InboundDetailPage'
import OutboundListPage from '../pages/outbound/OutboundListPage'
import StaffOutboundPage from '../pages/outbound/StaffOutboundPage'
import InvoiceListPage from '../pages/invoices/InvoiceListPage'
import UserListPage from '../pages/users/UserListPage'

// Trang chủ theo vai trò
function Home() {
  const { user } = useAuth()
  return user.role === ROLES.STAFF ? <StaffDashboard /> : <AdminDashboard />
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route index element={<Home />} />

          <Route element={<RoleRoute allow={[ROLES.ADMIN]} />}>
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="inbound" element={<InboundListPage />} />
            <Route path="outbound" element={<OutboundListPage />} />
            <Route path="customers" element={<CustomerListPage />} />
            <Route path="invoices" element={<InvoiceListPage />} />
            <Route path="users" element={<UserListPage />} />
          </Route>

          <Route element={<RoleRoute allow={[ROLES.STAFF]} />}>
            <Route path="staff/inbound" element={<StaffInboundSchedulePage />} />
            <Route path="staff/counting" element={<StaffCountingListPage />} />
            <Route path="staff/counting/:id" element={<InboundDetailPage />} />
            <Route path="staff/outbound" element={<StaffOutboundPage />} />
            <Route path="staff/inventory" element={<StaffInventoryPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
