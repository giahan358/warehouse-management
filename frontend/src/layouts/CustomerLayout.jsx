import { Layout, Typography } from 'antd';
import { Outlet, useOutletContext } from 'react-router-dom';
import CustomerSidebar, { CustomerHeader } from './CustomerSidebar';

const { Content } = Layout;

export default function CustomerLayout() {
  const { user } = useOutletContext();

  return (
    <Layout className="customer-app-layout">
      <CustomerSidebar user={user} />
      <Layout className="customer-main-layout">
        <CustomerHeader user={user} />
        <Content className="customer-content">
          <div className="customer-content-inner">
            <Outlet context={{ user }} />
            <Typography.Text className="customer-footer">
              LogiStorage · Cổng thông tin khách hàng
            </Typography.Text>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
