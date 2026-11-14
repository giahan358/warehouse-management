import { Button, Result, Spin } from 'antd';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { customerApi } from '../api/customerPortalApi';
import CustomerLayout from '../layouts/CustomerLayout';
import CustomerDashboard from '../pages/dashboard/CustomerDashboard';
import CustomerInboundPage from '../pages/inbound/CustomerInboundPage';
import CustomerInvoicesPage from '../pages/invoices/CustomerInvoicesPage';
import CustomerOutboundPage from '../pages/outbound/CustomerOutboundPage';
import CustomerProductsPage from '../pages/inventory/CustomerProductsPage';
import CustomerProfilePage from '../pages/profile/CustomerProfilePage';
import useApiData from '../utils/useApiData';

function CustomerRoleRoute() {
  const { data: user, loading, error, reload } = useApiData(customerApi.getIdentity);

  if (loading) {
    return <div className="customer-auth-loading"><Spin size="large" /></div>;
  }

  if (error) {
    return (
      <Result
        status="403"
        title="Không thể xác thực tài khoản"
        subTitle={`${error} Vui lòng kiểm tra trạng thái xác thực rồi thử lại.`}
        extra={<Button type="primary" onClick={reload}>Thử lại</Button>}
      />
    );
  }

  if (!user || user.role !== 'CUSTOMER') {
    return (
      <Result
        status="403"
        title="Không có quyền truy cập"
        subTitle="Các trang này chỉ dành cho tài khoản có vai trò CUSTOMER."
      />
    );
  }

  return <Outlet context={{ user }} />;
}

export default function CustomerRoutes() {
  return (
    <Routes>
      <Route element={<CustomerRoleRoute />}>
        <Route element={<CustomerLayout />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<CustomerDashboard />} />
          <Route path="inbound" element={<CustomerInboundPage />} />
          <Route path="outbound" element={<CustomerOutboundPage />} />
          <Route path="products" element={<CustomerProductsPage />} />
          <Route path="invoices" element={<CustomerInvoicesPage />} />
          <Route path="profile" element={<CustomerProfilePage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/customer/overview" replace />} />
    </Routes>
  );
}
