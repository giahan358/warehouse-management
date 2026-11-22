import { useEffect, useState } from 'react'
import { Button, Input, Select, Space, Table, message } from 'antd'
import { PlusCircleOutlined, SearchOutlined, WarningOutlined, CarOutlined } from '@ant-design/icons'
import inboundApi from '../../api/inboundApi'
import PageHeader from '../../components/common/PageHeader'
import StatusTag from '../../components/common/StatusTag'
import { INBOUND_STATUS } from '../../constants/statuses'
import { formatNumber } from '../../utils/formatCurrency'
import AsnCreateModal from '../../components/forms/AsnCreateModal'
import AsnDetailModal from '../../components/common/AsnDetailModal'

const dockColor = { 'Dock D-01': '#0057c2', 'Dock D-02': '#727786', 'Dock D-03': '#006767' }

export default function InboundListPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState([])
  const [range, setRange] = useState('all')
  const [keyword, setKeyword] = useState('')
  const [customer, setCustomer] = useState('all')
  const [status, setFilterStatus] = useState('all')
  const [dock, setDock] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [detailReceiptId, setDetailReceiptId] = useState(null)

  useEffect(() => {
    inboundApi.getAll({ page: 0, size: 100 }).then(setRows)
      .catch((error) => message.error(error?.response?.data?.message ?? error.message ?? 'Không tải được danh sách phiếu nhập'))
      .finally(() => setLoading(false))
  }, [])

  const customers = [...new Set(rows.map((row) => row.customer).filter((value) => value && value !== '—'))]
  const docks = [...new Set(rows.map((row) => row.dock).filter(Boolean))]
  const filteredRows = rows.filter((row) => {
    const query = keyword.trim().toLowerCase()
    const matchesKeyword = !query || `${row.id} ${row.customer} ${row.truck}`.toLowerCase().includes(query)
    const matchesDate = (() => {
      if (range === 'all') return true
      const date = row.expectedAt ? new Date(row.expectedAt) : (() => {
        const match = String(row.time ?? '').match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/)
        return match ? new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]), Number(match[4] ?? 0), Number(match[5] ?? 0)) : null
      })()
      if (!date || Number.isNaN(date.getTime())) return false
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      if (range === 'today') return date >= today && date < new Date(today.getTime() + 86400000)
      if (range === '7d') return date >= new Date(today.getTime() - 6 * 86400000) && date < new Date(today.getTime() + 86400000)
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
    })()
    return matchesKeyword && matchesDate && (customer === 'all' || row.customer === customer)
      && (status === 'all' || row.status === status) && (dock === 'all' || row.dock === dock)
  })

  const setStatus = async (id, status) => {
    const row = rows.find((item) => item.id === id)
    if (!row) return
    try {
      const receiptId = row.receiptId ?? row.id
      const result = status === 'RECEIVING'
        ? await inboundApi.startReceipt(receiptId, row.dock)
        : status === 'CONFIRMED'
          ? await inboundApi.confirmReceipt(receiptId)
          : await inboundApi.cancelReceipt(receiptId)
      setRows((current) => current.map((item) => item.id === id ? { ...item, status, phase: status === 'SCHEDULED' ? 'WAITING' : status === 'RECEIVING' ? 'AT_DOCK' : 'DONE', actual: result?.actualTotal == null ? item.actual : Number(result.actualTotal) } : item))
      message.success(`Đã cập nhật phiếu ${id} sang ${status}`)
    } catch (error) {
      message.error(error?.response?.data?.error?.message ?? error?.response?.data?.message ?? error.message ?? 'Không cập nhật được phiếu nhập')
    }
  }

  const columns = [
    {
      title: 'MÃ PHIẾU ASN', dataIndex: 'id',
      render: (v, r) => <span className="mono-link" style={r.status === 'CANCELLED' ? { color: '#727786' } : undefined}>{r.status === 'CANCELLED' && <span style={{ color: '#ba1a1a' }}>⊗ </span>}{v}</span>,
    },
    { title: 'KHÁCH HÀNG & ZONE', dataIndex: 'customer' },
    {
      title: 'THỜI GIAN HẸN & XE',
      render: (_, r) => (
        <div className="mono" style={{ fontSize: 12 }}>
          {r.time}
          {r.truck && <div className="text-muted"><CarOutlined /> {r.truck}</div>}
        </div>
      ),
    },
    {
      title: 'CỬA DOCK & NHÂN SỰ', dataIndex: 'dock',
      render: (v) => v ? <span style={{ fontSize: 12 }}><span style={{ color: dockColor[v] }}>●</span> {v}</span> : <span className="text-muted">-- Chưa gán Dock --</span>,
    },
    {
      title: 'KHAI BÁO / THỰC TẾ', align: 'right',
      render: (_, r) => {
        const diff = r.actual != null && r.status === 'RECEIVING' ? r.actual - r.declared : 0
        return (
          <div className="mono" style={{ fontSize: 12 }}>
            {formatNumber(r.declared)} / <b>{r.actual == null ? '—' : formatNumber(r.actual)}</b> kiện
            {diff !== 0 && <div style={{ color: '#ba1a1a' }}><WarningOutlined /> Lệch: {diff} kiện</div>}
          </div>
        )
      },
    },
    { title: 'TRẠNG THÁI', dataIndex: 'status', align: 'center', render: (v) => <StatusTag map={INBOUND_STATUS} status={v} /> },
    {
      title: '', align: 'right',
      render: (_, r) => {
        if (r.status === 'RECEIVING') return (
          <Space split="|" size={4}>
            <a onClick={() => setStatus(r.id, 'CONFIRMED')}>Duyệt</a>
            <a style={{ color: '#ba1a1a' }} onClick={() => setStatus(r.id, 'CANCELLED')}>Từ chối</a>
          </Space>
        )
        if (r.status === 'SCHEDULED') return <a onClick={() => setStatus(r.id, 'RECEIVING')}>Bắt đầu nhận</a>
        return r.status === 'CONFIRMED'
          ? <a onClick={() => setDetailReceiptId(r.receiptId ?? r.id)}>Chi tiết</a>
          : <a className="text-muted">Chi tiết</a>
      },
    },
  ]

  return (
    <div className="page">
      <PageHeader
        eyebrow="PORTAL QUẢN TRỊ / VẬN HÀNH KHO / QUẢN LÝ PHIẾU NHẬP KHO (INBOUND)"
        title="Quản lý Nhập kho & Giám sát Tiếp nhận"
        tag="Hub Tân Bình • Node HCM-01"
        extra={<Button type="primary" size="large" icon={<PlusCircleOutlined />} onClick={() => setCreateOpen(true)}>Tạo phiếu hẹn ASN hỗ trợ đối tác</Button>}
      />

      <div className="card-flat" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input style={{ width: 260 }} value={keyword} onChange={(event) => setKeyword(event.target.value)} prefix={<SearchOutlined />} placeholder="Tìm mã NK-, số xe, chủ hàng..." allowClear />
          <Select style={{ width: 220 }} value={customer} onChange={setCustomer} options={[{ value: 'all', label: 'Tất cả chủ hàng B2B' }, ...customers.map((name) => ({ value: name, label: name }))]} />
          <Select style={{ width: 240 }} value={status} onChange={setFilterStatus}
            options={[{ value: 'all', label: 'Tất cả trạng thái' }, ...Object.entries(INBOUND_STATUS).map(([value, s]) => ({ value, label: s.label }))]} />
          <Select style={{ width: 160 }} value={dock} onChange={setDock} options={[{ value: 'all', label: 'Tất cả Dock' }, ...docks.map((value) => ({ value, label: value }))]} />
        </Space>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, alignItems: 'center' }}>
          <Space>
            <span className="text-muted">Thời gian:</span>
            {[['all', 'Tất cả'], ['today', 'Hôm nay'], ['7d', '7 ngày qua'], ['month', 'Tháng này']].map(([k, l]) => (
              <Button key={k} size="small" type={range === k ? 'primary' : 'text'} onClick={() => setRange(k)}>{l}</Button>
            ))}
          </Space>
          <span className="text-muted">Đã chọn {selected.length}/{rows.length} phiếu hiển thị <a onClick={() => setSelected([])}>Hủy chọn</a></span>
        </div>
      </div>

        <Table rowKey="id" loading={loading} columns={columns} dataSource={filteredRows}
        rowSelection={{ selectedRowKeys: selected, onChange: setSelected }}
        rowClassName={(r) => (r.status === 'CANCELLED' ? 'row-danger' : '')}
        scroll={{ x: 1000 }}
        pagination={{ total: filteredRows.length, pageSize: 10, showSizeChanger: true, showTotal: (t) => `Tổng cộng ${t} phiếu nhập` }} />
      <AsnCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(created) => {
          const receipt = created?.data?.data ?? created?.data ?? created
          setRows((current) => [{
            id: receipt.receiptCode ?? String(receipt.id),
            receiptId: receipt.id,
            customer: receipt.customerName,
            time: receipt.expectedAt ? new Date(receipt.expectedAt).toLocaleString('vi-VN') : '',
            truck: receipt.vehiclePlate,
            dock: receipt.dockCode,
            declared: Number(receipt.declaredTotal ?? 0),
            actual: null,
            status: receipt.status ?? 'SCHEDULED',
          }, ...current])
        }}
      />
      <AsnDetailModal
        open={detailReceiptId != null}
        receiptId={detailReceiptId}
        readOnly
        onClose={() => setDetailReceiptId(null)}
      />
    </div>
  )
}
