import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import dayjs from 'dayjs'
import { Button, Input, Select, Space, Table, Tooltip, message } from 'antd'
import {
  PlusCircleOutlined, SearchOutlined, ReloadOutlined, EyeOutlined, SendOutlined,
  CloseOutlined, ThunderboltOutlined,
} from '@ant-design/icons'
import invoiceApi from '../../api/invoiceApi'
import paymentApi from '../../api/paymentApi'
import { USE_MOCK } from '../../api/axiosClient'
import PageHeader from '../../components/common/PageHeader'
import InvoiceCreateDrawer from '../../components/forms/InvoiceCreateDrawer'
import InvoiceDetailDrawer from '../../components/forms/InvoiceDetailDrawer'
import VnpayModal from '../../components/forms/VnpayModal'
import ConfirmModal from '../../components/common/ConfirmModal'
import StatusTag from '../../components/common/StatusTag'
import { INVOICE_STATUS } from '../../constants/statuses'
import { formatCurrency } from '../../utils/formatCurrency'

export default function InvoiceListPage() {
  const location = useLocation()
  const createFor = location.state?.createFor

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [ipnLogs, setIpnLogs] = useState([])
  const [keyword, setKeyword] = useState('')
  const [customerId, setCustomerId] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [month, setMonth] = useState('all')
  const [cancelTarget, setCancelTarget] = useState(null)
  const [pendingPayment, setPendingPayment] = useState(null)
  const [createOpen, setCreateOpen] = useState(!!createFor)
  const [detail, setDetail] = useState({ open: false, invoice: null })
  const [vnpay, setVnpay] = useState({ open: false, invoice: null })

  // async/await — setState chạy sau await, không phải sync
  const load = useCallback(async () => {
    try {
      const [d, payments] = await Promise.all([
        invoiceApi.getAll({ page: 0, size: 100 }),
        paymentApi.getPayments({ page: 0, size: 100, method: 'VNPAY' }),
      ])
      setRows(d)
      if (!USE_MOCK) {
        setPendingPayment(payments.items.find((payment) => payment.status === 'PENDING' && (payment.vnpTxnRef || payment.transactionRef)) ?? null)
        setIpnLogs(payments.items.map((payment) => ({
        time: payment.paidAt ? dayjs(payment.paidAt).format('DD/MM HH:mm:ss') : '—',
        txn: payment.vnpTxnRef ?? payment.transactionRef ?? '—',
        code: payment.vnpResponseCode ?? payment.status,
        label: payment.vnpResponseCode ?? payment.status,
        amount: Number(payment.amount ?? 0),
        paymentStatus: payment.status,
        })))
      }
    } catch (error) {
      message.error(error?.response?.data?.error?.message ?? error?.response?.data?.message ?? error.message ?? 'Không tải được hóa đơn và giao dịch')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const invoiceMonth = (row) => row.periodStart?.slice(0, 7) ?? row.id?.match(/^INV-(\d{4})(\d{2})/)?.slice(1).join('-')
  const customers = [...new Map(rows.map((row) => [String(row.customerId ?? row.customer), row.customer]).filter(([value, label]) => value && label)).entries()]
  const months = [...new Set(rows.map(invoiceMonth).filter(Boolean))].sort().reverse()
  const filteredRows = rows.filter((row) =>
    (customerId === 'all' || String(row.customerId ?? row.customer) === customerId) &&
    (statusFilter === 'all' || row.status === statusFilter) &&
    (month === 'all' || invoiceMonth(row) === month) &&
    `${row.id} ${row.customer} ${row.tax}`.toLowerCase().includes(keyword.trim().toLowerCase()))

  const openDetail = (invoice) => setDetail({ open: true, invoice })
  const openVnpay = (invoice) => {
    if (!USE_MOCK) {
      message.info('Khách hàng khởi tạo giao dịch VNPay từ cổng khách hàng; Admin theo dõi giao dịch tại đây.')
      return
    }
    setVnpay({ open: true, invoice })
  }

  const handleCreated = (row) => {
    setRows((rs) => [row, ...rs])
  }

  const cancelInvoice = async () => {
    if (!cancelTarget) return
    try {
      await invoiceApi.cancel(cancelTarget.invoiceId ?? cancelTarget.id)
      message.success(`Đã hủy hóa đơn ${cancelTarget.id}`)
      setCancelTarget(null)
      await load()
    } catch (error) {
      message.error(error?.response?.data?.error?.message ?? error?.response?.data?.message ?? error.message ?? 'Không hủy được hóa đơn')
    }
  }

  const sendInvoiceEmail = async (invoice) => {
    try {
      await invoiceApi.sendEmail(invoice.invoiceId ?? invoice.id)
      message.success(`Đã gửi hóa đơn ${invoice.id} qua email khách hàng`)
    } catch (error) {
      message.error(error?.response?.data?.error?.message ?? error?.response?.data?.message ?? error.message ?? 'Không gửi được email hóa đơn')
    }
  }

  const testIpn = async () => {
    if (USE_MOCK) return message.info('Đang dùng dữ liệu mô phỏng.')
    if (!pendingPayment) return message.warning('Chưa có giao dịch VNPay đang chờ để gửi IPN giả lập.')
    try {
      await paymentApi.simulateIpn(pendingPayment.vnpTxnRef ?? pendingPayment.transactionRef, '00', pendingPayment.amount)
      message.success('Đã gửi IPN giả lập thành công')
      await load()
    } catch (error) {
      message.error(error?.response?.data?.error?.message ?? error?.response?.data?.message ?? error.message ?? 'Không gửi được IPN giả lập')
    }
  }

  // Kết quả webhook IPN giả lập: '00' => PAID, '24' => giữ nguyên trạng thái
  const handleIpnResult = (invoice, code) => {
    if (code === '00') setRows((rs) => rs.map((r) => (r.id === invoice.id ? { ...r, status: 'PAID' } : r)))
    setIpnLogs((ls) => [{
      time: dayjs().format('DD/MM HH:mm:ss'), txn: invoice.id, code,
      label: code === '00' ? '00 (Success)' : '24 (User Canceled)', amount: invoice.total,
    }, ...ls])
  }

  const columns = [
    { title: 'MÃ HÓA ĐƠN', dataIndex: 'id', render: (v, r) => <a className="mono-link" onClick={() => openDetail(r)}>{v}</a> },
    {
      title: 'CHỦ HÀNG B2B', dataIndex: 'customer',
      render: (v, r) => (<div><b style={{ fontWeight: 500 }}>{v}</b><div className="mono text-muted">MST: {r.tax}</div></div>),
    },
    {
      title: 'TỔNG CƯỚC (VND)', dataIndex: 'total', align: 'right',
      render: (v, r) => <b className="mono" style={{ color: r.status === 'OVERDUE' ? '#ba1a1a' : undefined }}>{formatCurrency(v)}</b>,
    },
    { title: 'TRẠNG THÁI', dataIndex: 'status', align: 'center', render: (v) => <StatusTag map={INVOICE_STATUS} status={v} /> },
    {
      title: '', align: 'right',
      render: (_, r) => (
        <Space>
          <Tooltip title="Xem chi tiết"><Button type="text" onClick={() => openDetail(r)} icon={<EyeOutlined style={{ color: '#0057c2' }} />} /></Tooltip>
          {r.status !== 'PAID' && r.status !== 'CANCELLED' && (
            <>
              <Tooltip title="Gửi hóa đơn qua email"><Button type="text" onClick={() => sendInvoiceEmail(r)} icon={<SendOutlined style={{ color: '#0057c2' }} />} /></Tooltip>
              <Tooltip title="Hủy hóa đơn"><Button type="text" onClick={() => setCancelTarget(r)} icon={<CloseOutlined style={{ color: '#ba1a1a' }} />} /></Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div className="page">
      <PageHeader
        eyebrow="PORTAL QUẢN TRỊ / TÀI CHÍNH & CƯỚC PHÍ / HÓA ĐƠN & PHÍ DỊCH VỤ VNPAY"
        title="Quản lý Hóa đơn phí dịch vụ thuê kho"
        extra={<Button type="primary" size="large" icon={<PlusCircleOutlined />} onClick={() => setCreateOpen(true)}>Lập hóa đơn cước mới (POST /invoices)</Button>}
      />

      <div className="card-flat" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input style={{ width: 340 }} value={keyword} onChange={(event) => setKeyword(event.target.value)} allowClear prefix={<SearchOutlined />} placeholder="Tìm theo Mã hóa đơn (INV-...), MST khách hàng..." />
          <Select style={{ width: 200 }} value={customerId} onChange={setCustomerId} options={[{ value: 'all', label: 'Tất cả Khách Hàng B2B' }, ...customers.map(([value, label]) => ({ value, label }))]} />
          <Select style={{ width: 180 }} value={statusFilter} onChange={setStatusFilter}
            options={[{ value: 'all', label: 'Tất cả Trạng Thái' }, ...Object.entries(INVOICE_STATUS).map(([value, s]) => ({ value, label: s.label }))]} />
          <Select style={{ width: 160 }} value={month} onChange={setMonth} options={[{ value: 'all', label: 'Tất cả kỳ' }, ...months.map((value) => ({ value, label: `Kỳ ${dayjs(`${value}-01`).format('MM/YYYY')}` }))]} />
          <Button icon={<ReloadOutlined />} onClick={() => { setKeyword(''); setCustomerId('all'); setStatusFilter('all'); setMonth('all') }} />
        </Space>
      </div>

      <div className="card-flat" style={{ padding: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: 16 }}>
          <b>Danh Sách Hóa Đơn Dịch Vụ Kho Vận <span className="chip">{filteredRows.length} bản ghi</span></b>
          <span className="text-muted">Tự động đồng bộ IPN: 30s/lần</span>
        </div>
        <Table rowKey="id" loading={loading} columns={columns} dataSource={filteredRows}
          pagination={{ total: filteredRows.length, pageSize: 10, showSizeChanger: true, showTotal: (t) => `Tổng cộng ${t} hóa đơn phát sinh`, style: { padding: '0 16px' } }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 16, marginTop: 16 }}>
        <div className="card-flat">
          <b><ThunderboltOutlined style={{ color: '#006767' }} /> Giám sát Webhook VNPay IPN Realtime</b>
          <div className="text-muted" style={{ marginBottom: 8 }}>Endpoint tiếp nhận Server-to-Server: <span className="chip">POST /api/v1/payments/vnpay-ipn</span></div>
          <Table size="small" rowKey={(r) => `${r.time}-${r.txn}`} pagination={false} dataSource={ipnLogs} columns={[
            { title: 'THỜI GIAN', dataIndex: 'time', render: (v) => <span className="mono">{v}</span> },
            { title: 'TXNREF', dataIndex: 'txn', render: (v) => <span className="mono-link">{v}</span> },
            { title: 'RSPCODE', dataIndex: 'label', render: (v, r) => <b className="mono" style={{ color: r.code === '00' ? '#389e0d' : '#ba1a1a' }}>{v}</b> },
            { title: 'SỐ TIỀN', dataIndex: 'amount', align: 'right', render: (v) => <span className="mono">{formatCurrency(v)}</span> },
          ]} />
        </div>

        <div className="card-flat">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <b>Thông Số Sandbox VNPay</b><span className="chip cyan">Active</span>
          </div>
          {[
            ['vnp_TmnCode:', 'LOGIST01'],
            ['vnp_HashSecret:', 'RAK829...91XA (HMAC-SHA512)'],
            ['vnp_Url Sandbox Gateway:', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'],
          ].map(([k, v]) => (
            <div key={k} style={{ background: '#eff4ff', borderRadius: 6, padding: '6px 10px', marginTop: 8 }}>
              <div className="mono text-muted">{k}</div>
              <div className="mono" style={{ fontWeight: 600, wordBreak: 'break-all' }}>{v}</div>
            </div>
          ))}
          <div className="text-muted" style={{ display: 'flex', justifyContent: 'space-between', margin: '12px 0 8px' }}>
            <span>Tỷ lệ xác thực checksum</span><b className="mono" style={{ color: '#006767' }}>100% (An toàn)</b>
          </div>
          <Button block icon={<ThunderboltOutlined />} onClick={testIpn}>Gửi Test Ping Giả Lập IPN (Mock Post)</Button>
        </div>
      </div>

      <InvoiceCreateDrawer open={createOpen} defaultCustomerId={createFor}
        onClose={() => setCreateOpen(false)} onCreated={handleCreated} />
      <InvoiceDetailDrawer open={detail.open} invoice={detail.invoice}
        onClose={() => setDetail((d) => ({ ...d, open: false }))}
        onOpenVnpay={(inv) => { setDetail((d) => ({ ...d, open: false })); openVnpay(inv) }} />
      <VnpayModal open={vnpay.open} invoice={vnpay.invoice}
        onClose={() => setVnpay((v) => ({ ...v, open: false }))} onResult={handleIpnResult} />
      <ConfirmModal open={!!cancelTarget} danger title="Hủy hóa đơn"
        content={`Bạn có chắc muốn hủy hóa đơn ${cancelTarget?.id}? BE chỉ cho phép hủy hóa đơn chưa thanh toán.`}
        onOk={cancelInvoice} onCancel={() => setCancelTarget(null)} />
    </div>
  )
}
