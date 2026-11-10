import { useCallback, useState } from 'react';
import {
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Typography,
} from 'antd';
import { customerApi, getApiErrorMessage } from '../../api/customerPortalApi';
import ApiPanel from '../../components/common/ApiPanel';
import CustomerPageHeader from '../../components/common/CustomerPageHeader';
import CustomerStatusTag from '../../components/common/CustomerStatusTag';
import useApiData from '../../utils/useApiData';
import { formatNumber } from '../../utils/customerFormatters';

const pageSize = 20;
const categories = [
  { value: 'ELECTRONIC', label: 'Điện tử' },
  { value: 'COSMETIC', label: 'Mỹ phẩm' },
  { value: 'PHARMA', label: 'Dược phẩm' },
  { value: 'FASHION', label: 'Thời trang' },
  { value: 'PACKAGING', label: 'Bao bì' },
  { value: 'OTHER', label: 'Khác' },
];

export default function ProductsPage() {
  const [page, setPage] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [searchText, setSearchText] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form] = Form.useForm();

  const loadProducts = useCallback(
    () => customerApi.products.getList({
      page,
      size: pageSize,
      keyword: keyword || undefined,
      category: category || undefined,
      status: status || undefined,
    }),
    [category, keyword, page, status],
  );
  const products = useApiData(loadProducts);

  const openCreate = () => {
    setSelectedProduct(null);
    form.resetFields();
    setFormOpen(true);
  };

  const openEdit = (record) => {
    setSelectedProduct(record);
    form.setFieldsValue({
      sku: record.sku,
      barcode: record.barcode,
      name: record.name,
      category: record.category,
      description: record.description,
      unit: record.unit,
      lengthCm: record.lengthCm,
      widthCm: record.widthCm,
      heightCm: record.heightCm,
    });
    setFormOpen(true);
  };

  const submitProduct = async (values) => {
    setBusy(true);
    try {
      const payload = {
        sku: values.sku,
        barcode: values.barcode || undefined,
        name: values.name,
        category: values.category || undefined,
        description: values.description || undefined,
        unit: values.unit,
        lengthCm: values.lengthCm ?? undefined,
        widthCm: values.widthCm ?? undefined,
        heightCm: values.heightCm ?? undefined,
      };
      if (selectedProduct) {
        await customerApi.products.update(selectedProduct.id, payload);
        message.success('Đã cập nhật thông tin sản phẩm.');
      } else {
        await customerApi.products.create(payload);
        message.success('Đã tạo sản phẩm.');
      }
      setFormOpen(false);
      products.reload();
    } catch (error) {
      message.error(getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const toggleProductStatus = async (record, checked) => {
    try {
      await customerApi.products.updateStatus(record.id, checked ? 'ACTIVE' : 'HIDDEN');
      message.success(checked ? 'Đã hiển thị sản phẩm.' : 'Đã ẩn sản phẩm.');
      products.reload();
    } catch (error) {
      message.error(getApiErrorMessage(error));
    }
  };

  const openDetails = async (record) => {
    setBusy(true);
    setDetailOpen(true);
    setSelectedProduct(null);
    try {
      setSelectedProduct(await customerApi.products.getById(record.id));
    } catch (error) {
      message.error(getApiErrorMessage(error));
      setDetailOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { title: 'Mã SKU / Barcode', key: 'sku', render: (_, record) => <div><Typography.Text strong code>{record.sku}</Typography.Text><Typography.Text type="secondary" className="table-subtext">{record.barcode || '—'}</Typography.Text></div> },
    { title: 'Tên sản phẩm', dataIndex: 'name', key: 'name' },
    { title: 'Danh mục', dataIndex: 'category', key: 'category', render: (value) => categories.find((item) => item.value === value)?.label || value || '—' },
    { title: 'Đơn vị', dataIndex: 'unit', key: 'unit' },
    { title: 'Kích thước (cm)', key: 'dimensions', render: (_, record) => [record.lengthCm, record.widthCm, record.heightCm].some((value) => value != null) ? `${record.lengthCm ?? '—'} × ${record.widthCm ?? '—'} × ${record.heightCm ?? '—'}` : '—' },
    { title: 'Thể tích / đơn vị', dataIndex: 'volumeM3', key: 'volumeM3', render: (value) => value == null ? '—' : `${formatNumber(value, 6)} m³` },
    { title: 'Tồn / Khả dụng', key: 'stock', render: (_, record) => <div><strong>{formatNumber(record.onHand)}</strong><Typography.Text type="secondary" className="table-subtext">Khả dụng: {formatNumber(record.available)}</Typography.Text></div> },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: (value) => <CustomerStatusTag status={value} /> },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button type="text" icon={<EyeOutlined />} aria-label="Xem chi tiết" onClick={() => openDetails(record)} />
          <Button type="text" icon={<EditOutlined />} aria-label="Sửa sản phẩm" onClick={() => openEdit(record)} />
          <Switch size="small" checked={record.status === 'ACTIVE'} aria-label="Trạng thái sản phẩm" onChange={(checked) => toggleProductStatus(record, checked)} />
        </Space>
      ),
    },
  ];

  return (
    <>
      <CustomerPageHeader
        title="Danh mục & Thông tin sản phẩm"
        subtitle="Quản lý danh mục sản phẩm thuộc doanh nghiệp và thông tin quy cách lưu kho."
        breadcrumb={['Trang chủ', 'Sản phẩm', 'Danh mục của tôi']}
        action={<><PlusOutlined /> Thêm sản phẩm mới</>}
        onAction={openCreate}
      />
      <div className="business-rule"><Typography.Text>Chỉ quản lý sản phẩm thuộc tài khoản khách hàng hiện tại. Tồn kho và thể tích do hệ thống cập nhật từ nghiệp vụ kho.</Typography.Text></div>
      <Card className="customer-data-card" variant="borderless">
        <div className="list-toolbar product-toolbar">
          <Input.Search allowClear value={searchText} onChange={(event) => setSearchText(event.target.value)} onSearch={(value) => { setKeyword(value.trim()); setPage(0); }} placeholder="Tìm SKU, tên sản phẩm hoặc barcode..." prefix={<SearchOutlined />} />
          <Select allowClear placeholder="Tất cả danh mục" value={category || undefined} options={categories} onChange={(value) => { setCategory(value || ''); setPage(0); }} />
          <Select allowClear placeholder="Tất cả trạng thái" value={status || undefined} options={[{ value: 'ACTIVE', label: 'Đang lưu kho' }, { value: 'HIDDEN', label: 'Đã ẩn' }]} onChange={(value) => { setStatus(value || ''); setPage(0); }} />
          <Button icon={<ReloadOutlined />} onClick={() => { setSearchText(''); setKeyword(''); setCategory(''); setStatus(''); setPage(0); }}>Đặt lại</Button>
        </div>
        <ApiPanel loading={products.loading} error={products.error} onRetry={products.reload}>
          {products.data && (
            <Table
              rowKey="id"
              columns={columns}
              dataSource={products.data.items}
              size="middle"
              scroll={{ x: 1100 }}
              pagination={{
                current: page + 1,
                pageSize,
                total: products.data.meta?.totalElements ?? products.data.items.length,
                showSizeChanger: false,
                showTotal: (total) => `Hiển thị ${products.data.items.length} / ${total} sản phẩm`,
                onChange: (current) => setPage(current - 1),
              }}
            />
          )}
        </ApiPanel>
      </Card>

      <Modal title={selectedProduct ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm'} open={formOpen} onCancel={() => setFormOpen(false)} onOk={() => form.submit()} confirmLoading={busy} okText={selectedProduct ? 'Lưu thay đổi' : 'Tạo sản phẩm'} width={760}>
        <Form form={form} layout="vertical" onFinish={submitProduct}>
          <div className="business-rule form-notice">Thể tích sản phẩm sẽ được Backend tự tính từ kích thước khai báo.</div>
          <Form.Item name="name" label="Tên sản phẩm" rules={[{ required: true }]}><Input maxLength={200} /></Form.Item>
          <div className="form-grid">
            <Form.Item name="sku" label="Mã SKU" rules={[{ required: true }]}><Input maxLength={100} /></Form.Item>
            <Form.Item name="barcode" label="Barcode"><Input maxLength={50} /></Form.Item>
            <Form.Item name="category" label="Danh mục"><Select allowClear options={categories} /></Form.Item>
            <Form.Item name="unit" label="Đơn vị tính" rules={[{ required: true }]}><Input maxLength={30} /></Form.Item>
            <Form.Item name="lengthCm" label="Chiều dài (cm)"><InputNumber min={0} precision={2} className="full-width" /></Form.Item>
            <Form.Item name="widthCm" label="Chiều rộng (cm)"><InputNumber min={0} precision={2} className="full-width" /></Form.Item>
            <Form.Item name="heightCm" label="Chiều cao (cm)"><InputNumber min={0} precision={2} className="full-width" /></Form.Item>
          </div>
          <Form.Item name="description" label="Mô tả"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="Chi tiết sản phẩm" open={detailOpen} onCancel={() => setDetailOpen(false)} footer={null}>
        {busy && !selectedProduct ? <div className="modal-loading">Đang tải thông tin sản phẩm...</div> : selectedProduct && (
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="Tên sản phẩm">{selectedProduct.name}</Descriptions.Item>
            <Descriptions.Item label="SKU">{selectedProduct.sku}</Descriptions.Item>
            <Descriptions.Item label="Barcode">{selectedProduct.barcode || '—'}</Descriptions.Item>
            <Descriptions.Item label="Danh mục">{selectedProduct.category || '—'}</Descriptions.Item>
            <Descriptions.Item label="Đơn vị">{selectedProduct.unit}</Descriptions.Item>
            <Descriptions.Item label="Thể tích / đơn vị">{selectedProduct.volumeM3 == null ? '—' : `${selectedProduct.volumeM3} m³`}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái"><CustomerStatusTag status={selectedProduct.status} /></Descriptions.Item>
            <Descriptions.Item label="Mô tả">{selectedProduct.description || '—'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </>
  );
}
