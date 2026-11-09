import { useEffect, useState } from 'react'
import { Button, Input, Select, Space, Table } from 'antd'
import { PlusCircleOutlined, SearchOutlined, WarningOutlined, CarOutlined } from '@ant-design/icons'
import inboundApi from '../../api/inboundApi'
import PageHeader from '../../components/common/PageHeader'
import StatusTag from '../../components/common/StatusTag'
import { INBOUND_STATUS } from '../../constants/statuses'
import { formatNumber } from '../../utils/formatCurrency'

const dockColor = { 'Dock D-01': '#0057c2', 'Dock D-02': '#727786', 'Dock D-03': '#006767' }

export default function InboundListPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState([])
  const [range, setRange] = useState('today')

  useEffect(() => { inboundApi.getAll().then((d) => { setRows(d); setLoading(false) }) }, [])

  const setStatus = (id, status) =>
    // TODO: PATCH /inbound-orders/{id}/status
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)))

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
        return <a className="text-muted">Chi tiết</a>
      },
    },
  ]

  return (
    <div className="page">
      <PageHeader
        eyebrow="PORTAL QUẢN TRỊ / VẬN HÀNH KHO / QUẢN LÝ PHIẾU NHẬP KHO (INBOUND)"
        title="Quản lý Nhập kho & Giám sát Tiếp nhận"
        tag="Hub Tân Bình • Node HCM-01"
        extra={<Button type="primary" size="large" icon={<PlusCircleOutlined />}>Tạo phiếu hẹn ASN hỗ trợ đối tác</Button>}
      />

      <div className="card-flat" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input style={{ width: 260 }} prefix={<SearchOutlined />} placeholder="Tìm mã NK-, số xe, chủ hàng..." />
          <Select style={{ width: 220 }} defaultValue="all" options={[{ value: 'all', label: 'Tất cả chủ hàng B2B' }]} />
          <Select style={{ width: 240 }} defaultValue="RECEIVING"
            options={[{ value: 'all', label: 'Tất cả trạng thái' }, ...Object.entries(INBOUND_STATUS).map(([value, s]) => ({ value, label: s.label }))]} />
          <Select style={{ width: 160 }} defaultValue="D-02" options={['D-01', 'D-02', 'D-03'].map((d) => ({ value: d, label: `Dock ${d}` }))} />
        </Space>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, alignItems: 'center' }}>
          <Space>
            <span className="text-muted">Thời gian:</span>
            {[['today', 'Hôm nay'], ['7d', '7 ngày qua'], ['month', 'Tháng 10/2024']].map(([k, l]) => (
              <Button key={k} size="small" type={range === k ? 'primary' : 'text'} onClick={() => setRange(k)}>{l}</Button>
            ))}
          </Space>
          <span className="text-muted">Đã chọn {selected.length}/{rows.length} phiếu hiển thị <a onClick={() => setSelected([])}>Hủy chọn</a></span>
        </div>
      </div>

      <Table rowKey="id" loading={loading} columns={columns} dataSource={rows}
        rowSelection={{ selectedRowKeys: selected, onChange: setSelected }}
        rowClassName={(r) => (r.status === 'CANCELLED' ? 'row-danger' : '')}
        scroll={{ x: 1000 }}
        pagination={{ total: 284, pageSize: 10, showSizeChanger: true, showTotal: (t) => `Đã chọn 1 - 5 trên tổng số ${t} phiếu nhập` }} />
    </div>
  )
}
