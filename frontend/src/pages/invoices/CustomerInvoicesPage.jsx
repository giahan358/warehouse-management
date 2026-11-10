import { useCallback, useState } from 'react';
import { CreditCardOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Input,
  message,
  Modal,
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

export default function InvoicesPage() {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('');
  const [keyword, setKeyword] = useState('');
  const [searchText, setSearchText] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadInvoices = useCallback(
    () => customerApi.invoices.getList({ page, size: pageSize, status: status || undefined, keyword: keyword || undefined }),
    [keyword, page, status],
  );
  const loadCurrent = useCallback(() => customerApi.invoices.getCurrent(), []);
  const invoices = useApiData(loadInvoices);
  const currentInvoice = useApiData(loadCurrent);

  const openDetails = async (invoice) => {
    setBusy(true);
    setDetailOpen(true);
    setSelectedInvoice(null);
    try {
      setSelectedInvoice(await customerApi.invoices.getById(invoice.id));
    } catch (error) {
      message.error(getApiErrorMessage(error));
      setDetailOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const payInvoice = async (invoice) => {
    setBusy(true);
    try {
      const payment = await customerApi.invoices.createVnpayPayment(invoice.id);
      if (!payment?.paymentUrl) {
        throw new Error('Backend không trả về liên kết thanh toán VNPay.');
      }
      window.location.assign(payment.paymentUrl);
    } catch (error) {
      message.error(getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { title: 'Kỳ cước', dataIndex: 'periodStart', key: 'periodStart', render: (value, record) => value && record.periodEnd ? `${formatDate(value)} – ${formatDate(record.periodEnd)}` : record.description || '—' },
    { title: 'Mã hóa đơn', dataIndex: 'invoiceCode', key: 'invoiceCode', render: (value) => <Typography.Text code>{value}</Typography.Text> },
    { title: 'Mô tả dịch vụ', dataIndex: 'description', key: 'description' },
    { title: 'Hạn thanh toán', dataIndex: 'dueDate', key: 'dueDate', render: formatDate },
    { title: 'Tổng thanh toán', dataIndex: 'totalAmount', key: 'totalAmount', render: (value) => <Typography.Text strong>{formatCurrency(value)}</Typography.Text> },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: (value) => <CustomerStatusTag status={value} /> },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, invoice) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => openDetails(invoice)}>Chi tiết</Button>
          {['UNPAID', 'OVERDUE'].includes(invoice.status) && <Button type="primary" size="small" icon={<CreditCardOutlined />} loading={busy} onClick={() => payInvoice(invoice)}>Thanh toán</Button>}
        </Space>
      ),
    },
  ];

  const itemColumns = [
    { title: 'Khoản mục phí', dataIndex: 'description', key: 'description' },
    { title: 'Khối lượng / SL', dataIndex: 'quantity', key: 'quantity', render: (value, record) => `${formatNumber(value, 3)} ${record.unit || ''}` },
    { title: 'Đơn giá', dataIndex: 'unitPrice', key: 'unitPrice', render: formatCurrency },
    { title: 'Thành tiền', dataIndex: 'lineAmount', key: 'lineAmount', render: formatCurrency },
  ];

  const paymentColumns = [
    { title: 'Phương thức', dataIndex: 'paymentMethod', key: 'paymentMethod' },
    { title: 'Mã giao dịch', dataIndex: 'vnpTransactionNo', key: 'vnpTransactionNo', render: (value, record) => value || record.id || '—' },
    { title: 'Số tiền', dataIndex: 'amount', key: 'amount', render: formatCurrency },
    { title: 'Thời gian', dataIndex: 'paidAt', key: 'paidAt', render: (value) => formatDate(value, true) },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: (value) => <CustomerStatusTag status={value} /> },
  ];

  const tabItems = [
    { key: '', label: 'Tất cả' },
    { key: 'UNPAID', label: 'Chưa thanh toán' },
    { key: 'OVERDUE', label: 'Quá hạn' },
    { key: 'PAID', label: 'Đã thanh toán' },
  ];

  return (
    <>
      <CustomerPageHeader
        title="Hóa đơn phí dịch vụ & Thanh toán"
        subtitle="Theo dõi phí lưu kho, phí nâng hạ và lịch sử giao dịch của doanh nghiệp."
        breadcrumb={['Trang chủ', 'Tài chính & Phí kho', 'Hóa đơn & Thanh toán']}
      />
      <ApiPanel loading={currentInvoice.loading} error={currentInvoice.error} onRetry={currentInvoice.reload}>
        {currentInvoice.data !== null && (
          <Card className="current-invoice-card" variant="borderless">
            {currentInvoice.data?.invoice ? (
              <>
                <div>
                  <Typography.Text type="secondary">CẦN THANH TOÁN KỲ NÀY</Typography.Text>
                  <Statistic value={currentInvoice.data.amountDue ?? currentInvoice.data.invoice.totalAmount} suffix="đ" />
                  <Typography.Text>Mã hóa đơn: <Typography.Text code>{currentInvoice.data.invoice.invoiceCode}</Typography.Text></Typography.Text>
                </div>
                <div className="invoice-current-meta">
                  <CustomerStatusTag status={currentInvoice.data.invoice.status} />
                  {currentInvoice.data.daysLeft != null && <span>Còn {formatNumber(currentInvoice.data.daysLeft)} ngày đến hạn</span>}
                  <Button type="primary" icon={<CreditCardOutlined />} loading={busy} onClick={() => payInvoice(currentInvoice.data.invoice)}>Thanh toán qua VNPay</Button>
                </div>
              </>
            ) : <Alert type="success" showIcon title="Không có hóa đơn cần thanh toán." />}
          </Card>
        )}
      </ApiPanel>

      <Card className="customer-data-card" variant="borderless">
        <div className="list-toolbar">
          <Input.Search
            allowClear
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            onSearch={(value) => { setKeyword(value.trim()); setPage(0); }}
            placeholder="Tìm mã hóa đơn..."
            style={{ maxWidth: 350 }}
            prefix={<SearchOutlined />}
          />
        </div>
        <Tabs activeKey={status} items={tabItems} onChange={(key) => { setStatus(key); setPage(0); }} />
        <ApiPanel loading={invoices.loading} error={invoices.error} onRetry={invoices.reload}>
          {invoices.data && (
            <Table
              rowKey={(record) => record.id ?? record.invoiceCode}
              columns={columns}
              dataSource={invoices.data.items}
              size="middle"
              scroll={{ x: 900 }}
              pagination={{
                current: page + 1,
                pageSize,
                total: invoices.data.meta?.totalElements ?? invoices.data.items.length,
                showSizeChanger: false,
                showTotal: (total) => `Hiển thị ${invoices.data.items.length} / ${total} hóa đơn`,
                onChange: (current) => setPage(current - 1),
              }}
            />
          )}
        </ApiPanel>
      </Card>

      <Modal title="Chi tiết hóa đơn" open={detailOpen} onCancel={() => setDetailOpen(false)} footer={null} width={860}>
        {busy && !selectedInvoice ? <div className="modal-loading">Đang tải chi tiết hóa đơn...</div> : selectedInvoice && (
          <>
            <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 3 }}>
              <Descriptions.Item label="Mã hóa đơn">{selectedInvoice.invoiceCode}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái"><CustomerStatusTag status={selectedInvoice.status} /></Descriptions.Item>
              <Descriptions.Item label="Hạn thanh toán">{formatDate(selectedInvoice.dueDate)}</Descriptions.Item>
              <Descriptions.Item label="Kỳ hóa đơn">{formatDate(selectedInvoice.periodStart)} – {formatDate(selectedInvoice.periodEnd)}</Descriptions.Item>
              <Descriptions.Item label="Tiền trước thuế">{formatCurrency(selectedInvoice.amount)}</Descriptions.Item>
              <Descriptions.Item label="VAT">{formatCurrency(selectedInvoice.vatAmount)}</Descriptions.Item>
              <Descriptions.Item label="Tổng thanh toán">{formatCurrency(selectedInvoice.totalAmount)}</Descriptions.Item>
            </Descriptions>
            <div className="detail-toolbar"><Typography.Title level={5}>Chi tiết phí dịch vụ</Typography.Title></div>
            <Table rowKey={(item, index) => item.id ?? index} columns={itemColumns} dataSource={selectedInvoice.items || []} pagination={false} size="small" />
            <div className="detail-toolbar"><Typography.Title level={5}>Giao dịch thanh toán</Typography.Title></div>
            <Table rowKey={(payment, index) => payment.id ?? index} columns={paymentColumns} dataSource={selectedInvoice.payments || []} pagination={false} size="small" />
            {['UNPAID', 'OVERDUE'].includes(selectedInvoice.status) && <div className="modal-footer-action"><Button type="primary" icon={<CreditCardOutlined />} loading={busy} onClick={() => payInvoice(selectedInvoice)}>Thanh toán qua VNPay</Button></div>}
          </>
        )}
      </Modal>
    </>
  );
}
