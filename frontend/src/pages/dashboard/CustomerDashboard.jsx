import { useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  ArrowRightOutlined,
  InboxOutlined,
  ProductOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import { Button, Card, Col, Empty, Progress, Row, Space, Statistic, Table, Tag, Typography } from 'antd';
import { customerApi } from '../../api/customerPortalApi';
import ApiPanel from '../../components/common/ApiPanel';
import CustomerPageHeader from '../../components/common/CustomerPageHeader';
import CustomerStatusTag from '../../components/common/CustomerStatusTag';
import useApiData from '../../utils/useApiData';
import { formatDate, formatNumber } from '../../utils/customerFormatters';

const operationColumns = [
  {
    title: 'Mã phiếu / đơn',
    dataIndex: 'code',
    key: 'code',
    render: (value) => <Typography.Text code>{value}</Typography.Text>,
  },
  {
    title: 'Loại',
    dataIndex: 'type',
    key: 'type',
    render: (value) => value === 'INBOUND' ? <Tag color="blue">Nhập kho</Tag> : <Tag color="cyan">Xuất kho</Tag>,
  },
  {
    title: 'Ngày tạo',
    dataIndex: 'createdAt',
    key: 'createdAt',
    render: (value) => formatDate(value),
  },
  {
    title: 'Số lượng',
    dataIndex: 'totalQuantity',
    key: 'totalQuantity',
    render: (value) => formatNumber(value),
  },
  {
    title: 'Trạng thái',
    dataIndex: 'status',
    key: 'status',
    render: (value) => <CustomerStatusTag status={value} />,
  },
];

const inventoryColumns = [
  { title: 'Sản phẩm', dataIndex: 'productName', key: 'productName' },
  { title: 'Mã SKU', dataIndex: 'sku', key: 'sku', render: (value) => <Typography.Text code>{value}</Typography.Text> },
  { title: 'Tồn thực tế', dataIndex: 'onHand', key: 'onHand', render: (value) => formatNumber(value) },
  { title: 'Tạm giữ', dataIndex: 'allocated', key: 'allocated', render: (value) => formatNumber(value) },
  { title: 'Khả dụng', dataIndex: 'available', key: 'available', render: (value) => formatNumber(value) },
  { title: 'Tình trạng', dataIndex: 'stockStatus', key: 'stockStatus', render: (value) => <CustomerStatusTag status={value} /> },
];

function SummaryCards({ summary }) {
  const cards = [
    { title: 'Dung tích lưu kho đã sử dụng', value: summary.usedM3, suffix: ` / ${formatNumber(summary.capacityM3, 2)} m³`, icon: <ProductOutlined /> },
    { title: 'Tổng hàng tồn thực tế', value: summary.totalOnHand, suffix: ' đơn vị', icon: <ProductOutlined /> },
    { title: 'Phiếu nhập đang hoạt động', value: summary.activeInboundCount, suffix: ' phiếu', icon: <InboxOutlined /> },
    { title: 'Hóa đơn chưa thanh toán', value: summary.unpaidInvoiceCount, suffix: ' hóa đơn', icon: <ShoppingCartOutlined /> },
  ];

  return (
    <Row gutter={[12, 12]}>
      {cards.map((card) => (
        <Col xs={12} xl={6} key={card.title}>
          <Card className="customer-stat-card" variant="borderless">
            <div className="stat-heading"><span>{card.title}</span><span className="stat-symbol">{card.icon}</span></div>
            <Statistic value={card.value ?? '—'} suffix={card.suffix} />
          </Card>
        </Col>
      ))}
    </Row>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useOutletContext();
  const loadSummary = useCallback(() => customerApi.dashboard.getSummary(), []);
  const loadOperations = useCallback(() => customerApi.dashboard.getOperations({ page: 0, size: 5 }), []);
  const loadInventory = useCallback(() => customerApi.inventory.getList({ page: 0, size: 5 }), []);
  const summary = useApiData(loadSummary);
  const operations = useApiData(loadOperations);
  const inventory = useApiData(loadInventory);

  return (
    <>
      <CustomerPageHeader
        title="Tổng quan & Tồn kho của tôi"
        subtitle="Theo dõi sức khỏe hàng hóa, dung lượng lưu kho và trạng thái các yêu cầu vận hành."
        breadcrumb={['Trang chủ', 'Tổng quan & Tồn kho']}
      />
      <div className="tenant-notice">Dữ liệu tồn kho được giới hạn theo doanh nghiệp gắn với tài khoản {user?.customerCode ? `(${user.customerCode})` : ''}.</div>
      <ApiPanel loading={summary.loading} error={summary.error} onRetry={summary.reload}>
        {summary.data && <SummaryCards summary={summary.data} />}
      </ApiPanel>

      <Row gutter={[12, 12]} className="customer-dashboard-secondary">
        <Col xs={24} xl={8}>
          <ApiPanel loading={summary.loading} error={summary.error} onRetry={summary.reload}>
            {summary.data && (
              <Card title="Dung lượng lưu kho" className="dashboard-card">
                <div className="capacity-stat">
                  <Statistic value={summary.data.usedM3 ?? '—'} suffix={`/ ${formatNumber(summary.data.capacityM3, 2)} m³`} />
                  {summary.data.usedPercent == null ? <div className="missing-progress">Chưa có tỷ lệ sử dụng từ hệ thống.</div> : <Progress percent={Number(summary.data.usedPercent)} showInfo />}
                </div>
                <Space className="dashboard-facts" orientation="vertical">
                  <span>Tồn khả dụng: <strong>{formatNumber(summary.data.totalAvailable)}</strong></span>
                  <span>Hàng đang tạm giữ: <strong>{formatNumber(summary.data.totalAllocated)}</strong></span>
                  <span>SKU đang lưu trữ: <strong>{formatNumber(summary.data.skuCount)}</strong></span>
                </Space>
              </Card>
            )}
          </ApiPanel>
        </Col>
        <Col xs={24} xl={16}>
          <ApiPanel loading={operations.loading} error={operations.error} onRetry={operations.reload}>
            {operations.data && (
              <Card
                title="Hoạt động kho gần đây"
                extra={<Button type="link" icon={<ArrowRightOutlined />} onClick={() => navigate('/customer/inbound')}>Xem lịch sử</Button>}
                className="dashboard-card"
              >
                {operations.data.items.length
                  ? <Table rowKey={(record) => `${record.type}-${record.refId || record.code}`} columns={operationColumns} dataSource={operations.data.items} pagination={false} size="small" />
                  : <Empty description="Chưa có hoạt động kho." />}
              </Card>
            )}
          </ApiPanel>
        </Col>
        <Col span={24}>
          <ApiPanel loading={inventory.loading} error={inventory.error} onRetry={inventory.reload}>
            {inventory.data && (
              <Card
                title="Danh mục & Top SKU tồn kho"
                extra={<Button type="link" onClick={() => navigate('/customer/products')}>Xem danh mục sản phẩm <ArrowRightOutlined /></Button>}
                className="dashboard-card"
              >
                {inventory.data.items.length
                  ? <Table rowKey="inventoryId" columns={inventoryColumns} dataSource={inventory.data.items} pagination={false} size="small" scroll={{ x: 760 }} />
                  : <Empty description="Chưa có tồn kho được ghi nhận." />}
              </Card>
            )}
          </ApiPanel>
        </Col>
      </Row>
    </>
  );
}
