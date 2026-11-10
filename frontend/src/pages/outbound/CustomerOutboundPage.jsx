import { useCallback, useState } from 'react';
import {
  DeleteOutlined,
  EyeOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Typography,
} from 'antd';
import { customerApi, getApiErrorMessage } from '../../api/customerPortalApi';
import ApiPanel from '../../components/common/ApiPanel';
import CustomerPageHeader from '../../components/common/CustomerPageHeader';
import CustomerStatusTag from '../../components/common/CustomerStatusTag';
import useApiData from '../../utils/useApiData';
import { formatCurrency, formatDate, formatNumber } from '../../utils/customerFormatters';

const pageSize = 10;
const countFields = {
  PENDING: 'pending',
  PREPARING: 'preparing',
  PACKED: 'packed',
  IN_DELIVERY: 'inDelivery',
};

export default function OutboundPage() {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('');
  const [keyword, setKeyword] = useState('');
  const [searchText, setSearchText] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form] = Form.useForm();

  const loadOrders = useCallback(
    () => customerApi.outbound.getList({ page, size: pageSize, status: status || undefined, keyword: keyword || undefined }),
    [keyword, page, status],
  );
  const loadCounts = useCallback(() => customerApi.outbound.getStatusCounts(), []);
  const loadInventory = useCallback(() => customerApi.inventory.getList({ page: 0, size: 100 }), []);
  const orders = useApiData(loadOrders);
  const counts = useApiData(loadCounts);
  const inventory = useApiData(loadInventory);

  const refresh = () => {
    orders.reload();
    counts.reload();
  };

  const openDetails = async (record) => {
    setBusy(true);
    setDetailOpen(true);
    setSelectedOrder(null);
    try {
      setSelectedOrder(await customerApi.outbound.getById(record.id));
    } catch (error) {
      message.error(getApiErrorMessage(error));
      setDetailOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const submitCreate = async (values) => {
    if (!inventory.data) {
      message.error(inventory.error || 'Chưa tải được tồn kho để tạo yêu cầu xuất.');
      return;
    }
    const stockItems = inventory.data.items;
    const insufficientItem = values.items.find((requested) => {
      const stock = stockItems.find((item) => item.productId === requested.productId);
      const available = Number(stock?.available);
      return !stock || !Number.isFinite(available) || Number(requested.quantityRequested) > available;
    });
    if (insufficientItem) {
      message.error('Số lượng yêu cầu vượt quá tồn khả dụng của sản phẩm đã chọn.');
      return;
    }

    setBusy(true);
    try {
      await customerApi.outbound.create({
        recipientName: values.recipientName,
        recipientPhone: values.recipientPhone,
        deliveryAddress: values.deliveryAddress,
        carrier: values.carrier || undefined,
        paymentMethod: values.paymentMethod,
        codAmount: values.paymentMethod === 'COD' ? values.codAmount || 0 : 0,
        note: values.note || undefined,
        items: values.items.map((item) => ({
          productId: item.productId,
          quantityRequested: item.quantityRequested,
        })),
      });
      message.success('Đã gửi yêu cầu xuất kho.');
      setCreateOpen(false);
      form.resetFields();
      refresh();
    } catch (error) {
      message.error(getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const cancelOrder = async (record) => {
    try {
      await customerApi.outbound.cancel(record.id);
      message.success('Đã hủy yêu cầu xuất kho.');
      refresh();
    } catch (error) {
      message.error(getApiErrorMessage(error));
    }
  };

  const columns = [
    { title: 'Mã đơn', dataIndex: 'orderCode', key: 'orderCode', render: (value) => <Typography.Text code>{value}</Typography.Text> },
    { title: 'Ngày tạo', dataIndex: 'createdAt', key: 'createdAt', render: (value) => formatDate(value, true) },
    {
      title: 'Người nhận & Địa chỉ',
      key: 'recipient',
      render: (_, record) => <div><strong>{record.recipientName}</strong><Typography.Text type="secondary" className="table-subtext">{record.recipientPhone} · {record.deliveryAddress}</Typography.Text></div>,
    },
    { title: 'Vận chuyển', dataIndex: 'carrier', key: 'carrier', render: (value, record) => <div>{value || 'Chưa chọn'}{record.trackingCode && <Typography.Text type="secondary" className="table-subtext">{record.trackingCode}</Typography.Text>}</div> },
    { title: 'Số mặt hàng', dataIndex: 'itemCount', key: 'itemCount', render: (value) => formatNumber(value) },
    { title: 'COD', dataIndex: 'codAmount', key: 'codAmount', render: (value, record) => record.paymentMethod === 'COD' ? formatCurrency(value) : '—' },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: (value) => <CustomerStatusTag status={value} /> },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => openDetails(record)}>Chi tiết</Button>
          {record.status === 'PENDING' && <Popconfirm title="Hủy yêu cầu xuất kho?" description="Tồn kho tạm giữ sẽ được giải phóng sau khi hủy thành công." onConfirm={() => cancelOrder(record)}><Button type="link" danger>Hủy</Button></Popconfirm>}
        </Space>
      ),
    },
  ];

  const statusTabs = [
    { key: '', label: 'Tất cả' },
    { key: 'PENDING', label: `Chờ xử lý (${counts.data?.pending ?? '—'})` },
    { key: 'PREPARING', label: `Đang soạn (${counts.data?.preparing ?? '—'})` },
    { key: 'PACKED', label: `Đã đóng gói (${counts.data?.packed ?? '—'})` },
    { key: 'IN_DELIVERY', label: `Đang giao (${counts.data?.inDelivery ?? '—'})` },
    { key: 'DELIVERED', label: `Đã giao (${counts.data?.delivered ?? '—'})` },
  ];

  const orderItemColumns = [
    { title: 'Sản phẩm', dataIndex: 'productName', key: 'productName' },
    { title: 'SKU', dataIndex: 'sku', key: 'sku', render: (value) => <Typography.Text code>{value}</Typography.Text> },
    { title: 'SL yêu cầu', dataIndex: 'quantityRequested', key: 'quantityRequested', render: formatNumber },
    { title: 'SL thực tế', dataIndex: 'quantityActual', key: 'quantityActual', render: (value) => formatNumber(value) },
    { title: 'Đơn giá dịch vụ', dataIndex: 'unitPrice', key: 'unitPrice', render: formatCurrency },
  ];

  return (
    <>
      <CustomerPageHeader
        title="Yêu cầu xuất kho & Giao hàng"
        subtitle="Tạo yêu cầu xuất các sản phẩm đang lưu kho và theo dõi tiến độ giao hàng."
        breadcrumb={['Trang chủ', 'Quản lý xuất kho', 'Yêu cầu xuất kho']}
        action={<><PlusOutlined /> Tạo đơn xuất kho</>}
        onAction={() => { form.resetFields(); setCreateOpen(true); }}
      />
      <Row gutter={[10, 10]} className="outbound-summary">
        {statusTabs.slice(1, 5).map((tab) => (
          <Col xs={12} md={6} key={tab.key}>
            <Card className="small-summary-card" variant="borderless" onClick={() => { setStatus(tab.key); setPage(0); }}>
              <Statistic title={tab.label.split(' (')[0]} value={counts.data?.[countFields[tab.key]] ?? '—'} />
            </Card>
          </Col>
        ))}
      </Row>
      <Card className="customer-data-card" variant="borderless">
        <div className="list-toolbar">
          <Input.Search
            allowClear
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            onSearch={(value) => { setKeyword(value.trim()); setPage(0); }}
            placeholder="Tìm mã đơn, SĐT, người nhận..."
            style={{ maxWidth: 350 }}
            prefix={<SearchOutlined />}
          />
          <Select
            value={status || undefined}
            allowClear
            placeholder="Tất cả trạng thái"
            options={statusTabs.slice(1).map((tab) => ({ value: tab.key, label: tab.label.split(' (')[0] }))}
            onChange={(value) => { setStatus(value || ''); setPage(0); }}
            style={{ width: 180 }}
          />
        </div>
        <Tabs activeKey={status} items={statusTabs.map((tab) => ({ key: tab.key, label: tab.label }))} onChange={(key) => { setStatus(key); setPage(0); }} />
        <ApiPanel loading={orders.loading} error={orders.error} onRetry={orders.reload}>
          {orders.data && (
            <Table
              rowKey={(record) => record.id ?? record.orderCode}
              columns={columns}
              dataSource={orders.data.items}
              size="middle"
              scroll={{ x: 1000 }}
              pagination={{
                current: page + 1,
                pageSize,
                total: orders.data.meta?.totalElements ?? orders.data.items.length,
                showSizeChanger: false,
                showTotal: (total) => `Hiển thị ${orders.data.items.length} / ${total} đơn`,
                onChange: (current) => setPage(current - 1),
              }}
            />
          )}
        </ApiPanel>
      </Card>

      <Modal title="Tạo yêu cầu xuất kho" open={createOpen} onCancel={() => setCreateOpen(false)} onOk={() => form.submit()} confirmLoading={busy} okText="Gửi yêu cầu" width={880}>
        <Form form={form} layout="vertical" initialValues={{ paymentMethod: 'VNPAY', items: [{}] }} onFinish={submitCreate}>
          <Typography.Title level={5}>Thông tin người nhận</Typography.Title>
          <Row gutter={12}>
            <Col xs={24} md={8}><Form.Item name="recipientName" label="Tên người nhận" rules={[{ required: true }]}><Input maxLength={150} /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="recipientPhone" label="Số điện thoại" rules={[{ required: true }]}><Input maxLength={20} /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="carrier" label="Đơn vị vận chuyển"><Select allowClear options={[{ value: 'GHN', label: 'Giao Hàng Nhanh' }, { value: 'VIETTEL_POST', label: 'Viettel Post' }, { value: 'SELF_PICKUP', label: 'Tự nhận hàng' }]} /></Form.Item></Col>
          </Row>
          <Form.Item name="deliveryAddress" label="Địa chỉ giao hàng" rules={[{ required: true }]}><Input.TextArea maxLength={500} rows={2} /></Form.Item>
          <Row gutter={12}>
            <Col xs={24} md={12}><Form.Item name="paymentMethod" label="Phương thức thanh toán" rules={[{ required: true }]}><Select options={[{ value: 'VNPAY', label: 'VNPay' }, { value: 'COD', label: 'Thu hộ COD' }]} /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item noStyle shouldUpdate={(previous, current) => previous.paymentMethod !== current.paymentMethod}>{({ getFieldValue }) => getFieldValue('paymentMethod') === 'COD' ? <Form.Item name="codAmount" label="Số tiền thu hộ" rules={[{ required: true }]}><InputNumber min={0} precision={0} className="full-width" addonAfter="đ" /></Form.Item> : null}</Form.Item></Col>
          </Row>
          <Form.Item name="note" label="Ghi chú"><Input.TextArea maxLength={200} rows={2} /></Form.Item>
          <Typography.Title level={5}>Sản phẩm cần xuất</Typography.Title>
          <ApiPanel loading={inventory.loading} error={inventory.error} onRetry={inventory.reload}>
            <Form.List name="items">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Row gutter={8} key={key} align="middle">
                      <Col flex="auto"><Form.Item {...restField} name={[name, 'productId']} rules={[{ required: true, message: 'Chọn sản phẩm.' }]}><Select showSearch optionFilterProp="label" placeholder="Chọn hàng tồn kho" options={(inventory.data?.items || []).map((item) => ({ value: item.productId, label: `${item.sku} · ${item.productName} (khả dụng ${formatNumber(item.available)})` }))} /></Form.Item></Col>
                      <Col flex="180px"><Form.Item {...restField} name={[name, 'quantityRequested']} rules={[{ required: true }]}><InputNumber min={0.001} precision={3} className="full-width" placeholder="Số lượng xuất" /></Form.Item></Col>
                      <Col><Button danger type="text" icon={<DeleteOutlined />} disabled={fields.length === 1} onClick={() => remove(name)} /></Col>
                    </Row>
                  ))}
                  <Button type="dashed" icon={<PlusOutlined />} onClick={() => add()} block>Thêm sản phẩm</Button>
                </>
              )}
            </Form.List>
          </ApiPanel>
        </Form>
      </Modal>

      <Modal title="Chi tiết yêu cầu xuất kho" open={detailOpen} onCancel={() => setDetailOpen(false)} footer={null} width={860}>
        {busy && !selectedOrder ? <div className="modal-loading">Đang tải chi tiết đơn...</div> : selectedOrder && (
          <>
            <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 3 }}>
              <Descriptions.Item label="Mã đơn">{selectedOrder.orderCode}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái"><CustomerStatusTag status={selectedOrder.status} /></Descriptions.Item>
              <Descriptions.Item label="Ngày tạo">{formatDate(selectedOrder.createdAt, true)}</Descriptions.Item>
              <Descriptions.Item label="Người nhận">{selectedOrder.recipientName}</Descriptions.Item>
              <Descriptions.Item label="Điện thoại">{selectedOrder.recipientPhone}</Descriptions.Item>
              <Descriptions.Item label="Vận đơn">{selectedOrder.trackingCode || '—'}</Descriptions.Item>
              <Descriptions.Item label="Địa chỉ" span={3}>{selectedOrder.deliveryAddress}</Descriptions.Item>
            </Descriptions>
            <div className="detail-toolbar"><Typography.Title level={5}>Sản phẩm xuất kho</Typography.Title></div>
            <Table rowKey={(item) => item.itemId ?? item.productId} columns={orderItemColumns} dataSource={selectedOrder.items || []} pagination={false} size="small" />
          </>
        )}
      </Modal>
    </>
  );
}
