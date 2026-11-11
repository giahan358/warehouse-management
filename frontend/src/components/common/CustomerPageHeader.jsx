import { Breadcrumb, Button, Space, Typography } from 'antd';

export default function PageHeader({ title, subtitle, breadcrumb, action, onAction }) {
  return (
    <div className="customer-page-header">
      <Breadcrumb items={breadcrumb.map((title) => ({ title }))} />
      <div className="customer-page-title-row">
        <div>
          <Typography.Title level={3}>{title}</Typography.Title>
          {subtitle && <Typography.Paragraph className="page-subtitle">{subtitle}</Typography.Paragraph>}
        </div>
        {action && <Space><Button type="primary" onClick={onAction}>{action}</Button></Space>}
      </div>
    </div>
  );
}
