import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import dayjs from 'dayjs'
import { Button, Input, Select, Space, Table, Tooltip } from 'antd'
import {
  PlusCircleOutlined, SearchOutlined, ReloadOutlined, EyeOutlined, SendOutlined,
  CloseOutlined, ThunderboltOutlined,
} from '@ant-design/icons'
import invoiceApi from '../../api/invoiceApi'
import { ipnLogsMock } from '../../mocks/data'
import PageHeader from '../../components/common/PageHeader'
import InvoiceCreateDrawer from '../../components/forms/InvoiceCreateDrawer'
import InvoiceDetailDrawer from '../../components/forms/InvoiceDetailDrawer'
import VnpayModal from '../../components/forms/VnpayModal'
import StatusTag from '../../components/common/StatusTag'
import { INVOICE_STATUS } from '../../constants/statuses'
import { formatCurrency } from '../../utils/formatCurrency'

export default function InvoiceListPage() {
  const location = useLocation()
  const createFor = location.state?.createFor

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [ipnLogs, setIpnLogs] = useState(ipnLogsMock)
  const [createOpen, setCreateOpen] = useState(!!createFor)
  const [detail, setDetail] = useState({ open: false, invoice: null })
  const [vnpay, setVnpay] = useState({ open: false, invoice: null })

  // async/await — setState chạy sau await, không phải sync
  const load = useCallback(async () => {
    try {
      const d = await invoiceApi.getAll()
      setRows(d)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openDetail = (invoice) => setDetail({ open: true, invoice })
  const openVnpay = (invoice) => setVnpay({ open: true, invoice })

  const handleCreated = (row, method) => {
    setRows((rs) => [row, ...rs])
    if (method === 'VNPAY') openVnpay(row) 
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
          {r.status !== 'PAID' && (
            <>
              <Tooltip title="Gửi link thanh toán VNPay"><Button type="text" onClick={() => openVnpay(r)} icon={<SendOutlined style={{ color: '#0057c2' }} />} /></Tooltip>
              <Tooltip title="Hủy hóa đơn"><Button type="text" icon={<CloseOutlined style={{ color: '#ba1a1a' }} />} /></Tooltip>
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
          <Input style={{ width: 340 }} prefix={<SearchOutlined />} placeholder="Tìm theo Mã hóa đơn (INV-...), MST khách hàng..." />
          <Select style={{ width: 200 }} defaultValue="all" options={[{ value: 'all', label: 'Tất cả Khách Hàng B2B' }]} />
          <Select style={{ width: 180 }} defaultValue="all"
            options={[{ value: 'all', label: 'Tất cả Trạng Thái' }, ...Object.entries(INVOICE_STATUS).map(([value, s]) => ({ value, label: s.label }))]} />
          <Select style={{ width: 160 }} defaultValue="T10" options={[{ value: 'T10', label: 'Kỳ T10/2024' }, { value: 'T9', label: 'Kỳ T09/2024' }]} />
          <Button icon={<ReloadOutlined />} />
        </Space>
      </div>

      <div className="card-flat" style={{ padding: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: 16 }}>
          <b>Danh Sách Hóa Đơn Dịch Vụ Kho Vận <span className="chip">152 bản ghi</span></b>
          <span className="text-muted">Tự động đồng bộ IPN: 30s/lần</span>
        </div>
        <Table rowKey="id" loading={loading} columns={columns} dataSource={rows}
          pagination={{ total: 152, pageSize: 10, showSizeChanger: true, showTotal: (t) => `Hiển thị 1 - 4 của ${t} hóa đơn phát sinh`, style: { padding: '0 16px' } }} />
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
          <Button block icon={<ThunderboltOutlined />}>Gửi Test Ping Giả Lập IPN (Mock Post)</Button>
        </div>
      </div>

      <InvoiceCreateDrawer open={createOpen} defaultCustomerId={createFor}
        onClose={() => setCreateOpen(false)} onCreated={handleCreated} />
      <InvoiceDetailDrawer open={detail.open} invoice={detail.invoice}
        onClose={() => setDetail((d) => ({ ...d, open: false }))}
        onOpenVnpay={(inv) => { setDetail((d) => ({ ...d, open: false })); openVnpay(inv) }} />
      <VnpayModal open={vnpay.open} invoice={vnpay.invoice}
        onClose={() => setVnpay((v) => ({ ...v, open: false }))} onResult={handleIpnResult} />
    </div>
  )
}