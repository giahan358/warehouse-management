import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AppstoreOutlined,
  BankOutlined,
  CreditCardOutlined,
  InboxOutlined,
  LogoutOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Button, Menu, message, Progress, Spin, Typography } from 'antd';
import { customerApi, getApiErrorMessage } from '../api/customerPortalApi';
import useApiData from '../utils/useApiData';
import { formatNumber } from '../utils/customerFormatters';

const navigation = [
  { key: '/customer/overview', icon: <AppstoreOutlined />, label: 'Tổng quan & Tồn kho' },
  { key: '/customer/inbound', icon: <InboxOutlined />, label: 'Đăng ký & Lịch nhập' },
  { key: '/customer/outbound', icon: <ShoppingCartOutlined />, label: 'Yêu cầu xuất kho' },
  { key: '/customer/products', icon: <ShopOutlined />, label: 'Danh mục sản phẩm' },
  { key: '/customer/invoices', icon: <CreditCardOutlined />, label: 'Hóa đơn & Cước phí' },
  { key: '/customer/profile', icon: <BankOutlined />, label: 'Hồ sơ & Doanh nghiệp' },
];

export default function CustomerSidebar({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: customer, loading, error } = useApiData(customerApi.profile.get);
  const selectedKey = useMemo(
    () => navigation.find((item) => location.pathname.startsWith(item.key))?.key || '/customer/overview',
    [location.pathname],
  );
  const capacityPercent = customer?.usedPercent;

  return (
    <aside className="customer-sidebar">
      <div className="customer-brand">
        <div className="customer-brand-mark"><ShopOutlined /></div>
        <div><strong>LogiStorage</strong><span>Customer Portal</span></div>
      </div>
      <div className="customer-account">
        <span className="customer-account-label">KHÁCH HÀNG DOANH NGHIỆP</span>
        <Typography.Text strong ellipsis>{customer?.businessName || user?.businessName || user?.fullName}</Typography.Text>
        <span className="customer-code">{customer?.customerCode || user?.customerCode || '—'}</span>
      </div>
      <Menu
        className="customer-menu"
        mode="inline"
        selectedKeys={[selectedKey]}
        items={navigation}
        onClick={({ key }) => navigate(key)}
      />
      <div className="customer-sidebar-bottom">
        {loading ? <Spin size="small" /> : error ? (
          <Typography.Text type="danger" className="sidebar-error">Không tải được thông tin hạn mức</Typography.Text>
        ) : customer ? (
          <div className="capacity-widget">
            <div className="capacity-heading">
              <span>{customer.servicePackage || 'Gói dịch vụ'}</span>
              <strong>{capacityPercent == null ? '—' : `${capacityPercent}%`}</strong>
            </div>
            <div className="capacity-subtitle">Dung tích lưu kho</div>
            {capacityPercent == null
              ? <Typography.Text type="secondary">Chưa có tỷ lệ sử dụng.</Typography.Text>
              : <Progress percent={Number(capacityPercent)} showInfo={false} size="small" />}
            <div className="capacity-values">
              {formatNumber(customer.usedM3, 2)} / {formatNumber(customer.capacityM3, 2)} m³
            </div>
          </div>
        ) : null}
        <div className="customer-hotline"><UserOutlined /> Hồ sơ được bảo vệ theo tài khoản</div>
      </div>
    </aside>
  );
}

export function CustomerHeader({ user }) {
  const displayName = user?.fullName || user?.email || 'Tài khoản khách hàng';

  const logout = async () => {
    try {
      await customerApi.logout();
      window.location.assign('/customer/overview');
    } catch (error) {
      message.error(getApiErrorMessage(error));
    }
  };

  return (
    <header className="customer-topbar">
      <div className="warehouse-label"><ShopOutlined /> Cổng thông tin khách hàng</div>
      <div className="topbar-spacer" />
      <div className="customer-user">
        <span className="customer-avatar"><UserOutlined /></span>
        <div><strong>{displayName}</strong><span>{user?.email}</span></div>
      </div>
      <Button type="text" icon={<LogoutOutlined />} aria-label="Đăng xuất" onClick={logout} />
    </header>
  );
}
