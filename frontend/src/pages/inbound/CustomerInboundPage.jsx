import { useCallback, useState } from 'react';
import {
  CalendarOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FileSearchOutlined,
  InboxOutlined,
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
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import { customerApi, getApiErrorMessage } from '../../api/customerPortalApi';
import ApiPanel from '../../components/common/ApiPanel';
import CustomerPageHeader from '../../components/common/CustomerPageHeader';
import CustomerStatusTag from '../../components/common/CustomerStatusTag';
import useApiData from '../../utils/useApiData';
import { formatDate, formatNumber } from '../../utils/customerFormatters';

const pageSize = 10;

function localDateTimeValue(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

function toApiDateTime(value) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export default function InboundPage() {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('');
  const [keyword, setKeyword] = useState('');
  const [searchText, setSearchText] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [itemForm] = Form.useForm();

  const loadReceipts = useCallback(
    () => customerApi.inbound.getList({ page, size: pageSize, status: status || undefined, keyword: keyword || undefined }),
    [keyword, page, status],
  );
  const loadCounts = useCallback(() => customerApi.inbound.getStatusCounts(), []);
  const loadProducts = useCallback(() => customerApi.products.getList({ page: 0, size: 100, status: 'ACTIVE' }), []);
  const receipts = useApiData(loadReceipts);
  const counts = useApiData(loadCounts);
  const products = useApiData(loadProducts);

  const refresh = () => {
    receipts.reload();
    counts.reload();
  };

  const openDetails = async (record) => {
    setBusy(true);
    setDetailOpen(true);
    setSelectedReceipt(null);
    try {
      setSelectedReceipt(await customerApi.inbound.getById(record.id));
    } catch (error) {
      message.error(getApiErrorMessage(error));
      setDetailOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const submitCreate = async (values) => {
    if (!products.data) {
      message.error(products.error || 'Chưa tải được danh mục sản phẩm để đăng ký nhập kho.');
      return;
    }
    setBusy(true);
    try {
      await customerApi.inbound.create({
        expectedAt: toApiDateTime(values.expectedAt),
        vehiclePlate: values.vehiclePlate || undefined,
        timeSlot: values.timeSlot,
        note: values.note || undefined,
        items: values.items.map((item) => ({
          productId: item.productId,
          expectedQuantity: item.expectedQuantity,
        })),
      });
      message.success('Đã gửi đăng ký lịch nhập kho.');
      setCreateOpen(false);
      form.resetFields();
      refresh();
    } catch (error) {
      message.error(getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (receipt) => {
    setSelectedReceipt(receipt);
    editForm.setFieldsValue({
      expectedAt: localDateTimeValue(receipt.expectedAt),
      vehiclePlate: receipt.vehiclePlate,
      timeSlot: receipt.timeSlot,
      note: receipt.note,
    });
    setEditOpen(true);
  };

  const submitEdit = async (values) => {
    setBusy(true);
    try {
      await customerApi.inbound.update(selectedReceipt.id, {
        expectedAt: toApiDateTime(values.expectedAt),
        vehiclePlate: values.vehiclePlate || undefined,
        timeSlot: values.timeSlot,
        note: values.note || undefined,
      });
      message.success('Đã cập nhật lịch nhập kho.');
      setEditOpen(false);
      refresh();
    } catch (error) {
      message.error(getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const cancelReceipt = async (record) => {
    try {
      await customerApi.inbound.cancel(record.id);
      message.success('Đã hủy lịch nhập kho.');
      refresh();
    } catch (error) {
      message.error(getApiErrorMessage(error));
    }
  };

  const addReceiptItem = async (values) => {
    setBusy(true);
    try {
      if (selectedItem) {
        await customerApi.inbound.updateItem(selectedReceipt.id, selectedItem.itemId, { expectedQuantity: values.expectedQuantity });
        message.success('Đã cập nhật số lượng khai báo.');
      } else {
        await customerApi.inbound.addItem(selectedReceipt.id, values);
        message.success('Đã thêm sản phẩm vào phiếu nhập.');
      }
      setItemOpen(false);
      setSelectedItem(null);
      itemForm.resetFields();
      await openDetails({ id: selectedReceipt.id });
      refresh();
    } catch (error) {
      message.error(getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const deleteReceiptItem = async (itemId) => {
    try {
      await customerApi.inbound.removeItem(selectedReceipt.id, itemId);
      message.success('Đã xóa sản phẩm khỏi phiếu nhập.');
      await openDetails({ id: selectedReceipt.id });
      refresh();
    } catch (error) {
      message.error(getApiErrorMessage(error));
    }
  };

  const showDiscrepancy = async () => {
    setBusy(true);
    try {
      const report = await customerApi.inbound.getDiscrepancyReport(selectedReceipt.id);
      Modal.info({
        title: 'Biên bản chênh lệch nhập kho',
        width: 720,
        content: <pre className="report-json">{JSON.stringify(report, null, 2)}</pre>,
      });
    } catch (error) {
      message.error(getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const itemColumns = [
    { title: 'Sản phẩm', dataIndex: 'productName', key: 'productName' },
    { title: 'SKU', dataIndex: 'sku', key: 'sku', render: (value) => <Typography.Text code>{value}</Typography.Text> },
    { title: 'Đơn vị', dataIndex: 'unit', key: 'unit' },
    { title: 'Số lượng khai báo', dataIndex: 'expectedQuantity', key: 'expectedQuantity', render: (value) => formatNumber(value) },
    ...(selectedReceipt?.status === 'SCHEDULED' ? [{
      title: 'Thao tác',
      key: 'action',
      render: (_, item) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} aria-label="Sửa số lượng" onClick={() => { setSelectedItem(item); itemForm.setFieldsValue({ productId: item.productId, expectedQuantity: item.expectedQuantity }); setItemOpen(true); }} />
          <Popconfirm title="Xóa sản phẩm khỏi phiếu?" onConfirm={() => deleteReceiptItem(item.itemId)}><Button danger type="text" icon={<DeleteOutlined />} /></Popconfirm>
        </Space>
      ),
    }] : []),
  ];

  const columns = [
    { title: 'Mã phiếu ASN', dataIndex: 'receiptCode', key: 'receiptCode', render: (value) => <Typography.Text code>{value}</Typography.Text> },
    { title: 'Ngày tạo', dataIndex: 'createdAt', key: 'createdAt', render: (value) => formatDate(value, true) },
    { title: 'Giờ dự kiến', dataIndex: 'expectedAt', key: 'expectedAt', render: (value) => <Space><CalendarOutlined />{formatDate(value, true)}</Space> },
    { title: 'Biển số xe', dataIndex: 'vehiclePlate', key: 'vehiclePlate', render: (value) => value || '—' },
    { title: 'Khai báo', dataIndex: 'declaredTotal', key: 'declaredTotal', render: (value) => formatNumber(value) },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: (value) => <CustomerStatusTag status={value} /> },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Space size={2}>
          <Button type="link" icon={<EyeOutlined />} onClick={() => openDetails(record)}>Chi tiết</Button>
          {record.status === 'SCHEDULED' && <>
            <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(record)}>Sửa</Button>
            <Popconfirm title="Hủy lịch nhập kho này?" description="Chỉ có thể hủy khi phiếu còn ở trạng thái chờ tiếp nhận." onConfirm={() => cancelReceipt(record)}>
              <Button type="link" danger>Hủy</Button>
            </Popconfirm>
          </>}
        </Space>
      ),
    },
  ];

  const statusTabs = [
    { key: '', label: `Tất cả (${counts.data?.all ?? '—'})` },
    { key: 'SCHEDULED', label: `Chờ xe đến (${counts.data?.scheduled ?? '—'})` },
    { key: 'RECEIVING', label: `Đang tiếp nhận (${counts.data?.receiving ?? '—'})` },
    { key: 'CONFIRMED', label: `Đã nhập (${counts.data?.confirmed ?? '—'})` },
    { key: 'CANCELLED', label: `Đã hủy (${counts.data?.cancelled ?? '—'})` },
  ];

  return (
    <>
      <CustomerPageHeader
        title="Đăng ký & Lịch nhập kho"
        subtitle="Khai báo lịch xe đến kho, danh sách sản phẩm và theo dõi trạng thái tiếp nhận."
        breadcrumb={['Trang chủ', 'Quản lý nhập kho', 'Đăng ký lịch nhập']}
        action={<><PlusOutlined /> Tạo phiếu nhập</>}
        onAction={() => { form.resetFields(); setCreateOpen(true); }}
      />
      <div className="business-rule">
        <InboxOutlined />
        <span>Quy định nghiệp vụ: Khách hàng chỉ được sửa hoặc hủy phiếu khi trạng thái <Tag color="blue">SCHEDULED</Tag>. Khi kho bắt đầu tiếp nhận, phiếu sẽ được khóa chỉnh sửa.</span>
      </div>
      <Card className="customer-data-card" variant="borderless">
        <div className="list-toolbar">
          <Input.Search
            allowClear
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            onSearch={(value) => { setKeyword(value.trim()); setPage(0); }}
            placeholder="Tìm mã ASN, biển số xe..."
            style={{ maxWidth: 340 }}
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
        <Tabs
          activeKey={status}
          items={statusTabs.map((tab) => ({ key: tab.key, label: tab.label }))}
          onChange={(key) => { setStatus(key); setPage(0); }}
        />
        <ApiPanel loading={receipts.loading} error={receipts.error} onRetry={receipts.reload}>
          {receipts.data && (
            <Table
              rowKey={(record) => record.id ?? record.receiptCode}
              columns={columns}
              dataSource={receipts.data.items}
              size="middle"
              scroll={{ x: 900 }}
              pagination={{
                current: page + 1,
                pageSize,
                total: receipts.data.meta?.totalElements ?? receipts.data.items.length,
                showSizeChanger: false,
                showTotal: (total) => `Hiển thị ${receipts.data.items.length} / ${total} phiếu`,
                onChange: (current) => setPage(current - 1),
              }}
            />
          )}
        </ApiPanel>
      </Card>

      <Modal title="Tạo phiếu đăng ký nhập kho" open={createOpen} onCancel={() => setCreateOpen(false)} onOk={() => form.submit()} confirmLoading={busy} okText="Gửi đăng ký" width={820}>
        <Form form={form} layout="vertical" onFinish={submitCreate} initialValues={{ timeSlot: 'MORNING', items: [{}] }}>
          <Row gutter={12}>
            <Col xs={24} md={12}><Form.Item name="expectedAt" label="Ngày giờ dự kiến" rules={[{ required: true, message: 'Chọn ngày giờ dự kiến xe đến.' }]}><Input type="datetime-local" /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="timeSlot" label="Ca giao xe" rules={[{ required: true }]}><Select options={[{ value: 'MORNING', label: 'Buổi sáng' }, { value: 'AFTERNOON', label: 'Buổi chiều' }]} /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="vehiclePlate" label="Biển số xe"><Input maxLength={20} /></Form.Item></Col>
          </Row>
          <Form.Item name="note" label="Ghi chú"><Input.TextArea maxLength={1000} rows={2} /></Form.Item>
          <Typography.Title level={5}>Sản phẩm dự kiến nhập</Typography.Title>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Row gutter={8} key={key} align="middle">
                    <Col flex="auto"><Form.Item {...restField} name={[name, 'productId']} rules={[{ required: true, message: 'Chọn sản phẩm.' }]}><Select showSearch optionFilterProp="label" placeholder="Chọn sản phẩm" loading={products.loading} options={(products.data?.items || []).map((product) => ({ value: product.id, label: `${product.sku} · ${product.name}` }))} /></Form.Item></Col>
                    <Col flex="180px"><Form.Item {...restField} name={[name, 'expectedQuantity']} rules={[{ required: true, message: 'Nhập số lượng.' }]}><InputNumber min={0.001} precision={3} className="full-width" placeholder="Số lượng khai báo" /></Form.Item></Col>
                    <Col><Button danger type="text" icon={<DeleteOutlined />} disabled={fields.length === 1} onClick={() => remove(name)} /></Col>
                  </Row>
                ))}
                <Button type="dashed" icon={<PlusOutlined />} onClick={() => add()} block>Thêm sản phẩm</Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      <Modal title="Cập nhật lịch nhập kho" open={editOpen} onCancel={() => setEditOpen(false)} onOk={() => editForm.submit()} confirmLoading={busy} okText="Lưu thay đổi">
        <Form form={editForm} layout="vertical" onFinish={submitEdit}>
          <Form.Item name="expectedAt" label="Ngày giờ dự kiến" rules={[{ required: true }]}><Input type="datetime-local" /></Form.Item>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="timeSlot" label="Ca giao xe" rules={[{ required: true }]}><Select options={[{ value: 'MORNING', label: 'Buổi sáng' }, { value: 'AFTERNOON', label: 'Buổi chiều' }]} /></Form.Item></Col>
            <Col span={12}><Form.Item name="vehiclePlate" label="Biển số xe"><Input maxLength={20} /></Form.Item></Col>
          </Row>
          <Form.Item name="note" label="Ghi chú"><Input.TextArea maxLength={1000} rows={3} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="Thông tin phiếu nhập kho" open={detailOpen} onCancel={() => setDetailOpen(false)} footer={null} width={860}>
        {busy && !selectedReceipt ? <div className="modal-loading">Đang tải chi tiết phiếu...</div> : selectedReceipt && (
          <>
            <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 3 }}>
              <Descriptions.Item label="Mã phiếu">{selectedReceipt.receiptCode}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái"><CustomerStatusTag status={selectedReceipt.status} /></Descriptions.Item>
              <Descriptions.Item label="Ca giao xe">{selectedReceipt.timeSlot || '—'}</Descriptions.Item>
              <Descriptions.Item label="Ngày dự kiến">{formatDate(selectedReceipt.expectedAt, true)}</Descriptions.Item>
              <Descriptions.Item label="Biển số xe">{selectedReceipt.vehiclePlate || '—'}</Descriptions.Item>
              <Descriptions.Item label="Cửa dock">{selectedReceipt.dockCode || '—'}</Descriptions.Item>
              <Descriptions.Item label="Ghi chú" span={3}>{selectedReceipt.note || '—'}</Descriptions.Item>
            </Descriptions>
            <div className="detail-toolbar">
              <Typography.Title level={5}>Sản phẩm trong phiếu</Typography.Title>
              {selectedReceipt.status === 'SCHEDULED' && <Button icon={<PlusOutlined />} onClick={() => { itemForm.resetFields(); setItemOpen(true); }}>Thêm sản phẩm</Button>}
              {selectedReceipt.status === 'CONFIRMED' && <Button icon={<FileSearchOutlined />} onClick={showDiscrepancy}>Biên bản chênh lệch</Button>}
            </div>
            <Table rowKey={(item) => item.itemId ?? item.productId} columns={itemColumns} dataSource={selectedReceipt.items || []} pagination={false} size="small" />
          </>
        )}
      </Modal>
      <Modal title={selectedItem ? 'Cập nhật số lượng sản phẩm' : 'Thêm sản phẩm vào phiếu'} open={itemOpen} onCancel={() => { setItemOpen(false); setSelectedItem(null); }} onOk={() => itemForm.submit()} confirmLoading={busy} okText={selectedItem ? 'Cập nhật' : 'Thêm'}>
        <Form form={itemForm} layout="vertical" onFinish={addReceiptItem}>
          {!selectedItem && <Form.Item name="productId" label="Sản phẩm" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" loading={products.loading} options={(products.data?.items || []).map((product) => ({ value: product.id, label: `${product.sku} · ${product.name}` }))} /></Form.Item>}
          <Form.Item name="expectedQuantity" label="Số lượng khai báo" rules={[{ required: true }]}><InputNumber min={0.001} precision={3} className="full-width" /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}
