import { Alert, Button, Spin } from 'antd';

export default function ApiPanel({ loading, error, onRetry, children }) {
  if (loading) {
    return <div className="customer-panel-loading"><Spin /></div>;
  }
  if (error) {
    return <Alert type="error" showIcon title="Không thể tải dữ liệu" description={error} action={onRetry ? <Button size="small" onClick={onRetry}>Thử lại</Button> : null} />;
  }
  return children;
}
