import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Select, Table, Tag, Tooltip, Space, message } from 'antd'
import {
   SearchOutlined, ReloadOutlined, EyeOutlined, LockOutlined, UnlockOutlined,
   PhoneOutlined,
} from '@ant-design/icons'
import customerApi from '../../api/customerApi'
import PageHeader from '../../components/common/PageHeader'
import ConfirmModal from '../../components/common/ConfirmModal'
import CustomerDetailDrawer from '../../components/forms/CustomerDetailDrawer'
import CustomerCreateModal from '../../components/forms/CustomerCreateModal'
import { formatNumber } from '../../utils/formatCurrency'

const PLAN_STYLE = {
  ENTERPRISE: { background: '#dce9ff', color: '#0057c2' },
  PRO: { background: '#e5eeff', color: '#0057c2' },
  STANDARD: { background: '#68f7f7', color: '#004f50' },
}

function FeeTag({ r }) {
  if (r.fee === 'PAID') return <Tag color="success" style={{ borderRadius: 12 }}>● Đã thanh toán</Tag>
  return <Tag color="error" style={{ borderRadius: 12 }}>● Nợ phí {r.debt}</Tag>
}

export default function CustomerListPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [lockTarget, setLockTarget] = useState(null)
  const [detail, setDetail] = useState({ open: false, customer: null })
  const [createOpen, setCreateOpen] = useState(false)
  const [renewTarget, setRenewTarget] = useState(null)
  const navigate = useNavigate()

  useEffect(() => { customerApi.getAll().then((d) => { setRows(d); setLoading(false) }) }, [])

  const toggleLock = () => {
    // TODO: PATCH /users/{id}/status
    setRows((rs) => rs.map((r) => r.id === lockTarget.id
      ? { ...r, account: r.account === 'LOCKED' ? 'ACTIVE' : 'LOCKED' } : r))
    setLockTarget(null)
  }

  const renewContract = async () => {
    // TODO: POST /customers/{id}/contract/renew
    try {
      await customerApi.renewContract(renewTarget.id, 12)
      message.success(`Đã gia hạn hợp đồng ${renewTarget.id} thêm 12 tháng`)
    } catch (e) {
      message.error(e?.response?.data?.message ?? 'Không thể gia hạn hợp đồng')
    }
    setRenewTarget(null)
  }

  const filtered = rows.filter((r) =>
    `${r.id} ${r.name} ${r.phone}`.toLowerCase().includes(keyword.toLowerCase()))

  const columns = [
    { title: 'MÃ KHÁCH HÀNG', dataIndex: 'id', render: (v) => <span className="mono-link">{v}</span> },
    {
      title: 'TÊN DOANH NGHIỆP / ĐỐI TÁC', dataIndex: 'name', width: 340,
      render: (v, r) => (
        <div>
          <b>{v}</b> <span className="chip" style={PLAN_STYLE[r.plan]}>{r.plan}</span>
          <div className="text-muted">MST: {r.tax} • {r.location}</div>
        </div>
      ),
    },
    {
      title: 'ĐẠI DIỆN & LIÊN HỆ', dataIndex: 'rep',
      render: (v, r) => (
        <div style={{ fontSize: 12 }}>
          {v}
          <div className="mono text-muted"><PhoneOutlined /> {r.phone}</div>
        </div>
      ),
    },
    { title: 'DUNG LƯỢNG THUÊ', dataIndex: 'capacity', align: 'right', render: (v) => <b className="mono">{formatNumber(v)} m³</b> },
    {
      title: 'LƯU KHO (SKU / UNITS)', align: 'right',
      render: (_, r) => (
        <div className="mono" style={{ fontSize: 12 }}>
          <b>{formatNumber(r.sku)} SKU</b>
          <div className="text-muted">{formatNumber(r.units)} Units</div>
        </div>
      ),
    },
    { title: 'TRẠNG THÁI PHÍ', align: 'center', render: (_, r) => <FeeTag r={r} /> },
    {
      title: 'TÀI KHOẢN', align: 'center', dataIndex: 'account',
      render: (v) => v === 'LOCKED'
        ? <Tag color="#ba1a1a" icon={<LockOutlined />}>LOCKED</Tag>
        : <Tag color="success">ACTIVE</Tag>,
    },
    {
      title: 'THAO TÁC', align: 'center',
      render: (_, r) => (
        <Space>
          <Tooltip title="Xem chi tiết"><Button type="text" onClick={() => setDetail({ open: true, customer: r })} icon={<EyeOutlined style={{ color: '#0057c2' }} />} /></Tooltip>
          <Tooltip title={r.account === 'LOCKED' ? 'Mở khóa' : 'Khóa tài khoản'}>
            <Button type="text" onClick={() => setLockTarget(r)}
              icon={r.account === 'LOCKED' ? <UnlockOutlined style={{ color: '#006767' }} /> : <LockOutlined style={{ color: '#ba1a1a' }} />} />
          </Tooltip>
        </Space>
      ),
    },
  ]

  return (
    <div className="page">

      <PageHeader
        eyebrow="PORTAL QUẢN TRỊ / B2B PARTNERS"
        title="Quản lý Khách hàng Doanh nghiệp"
        subtitle="Theo dõi hợp đồng kho, hạn mức dung lượng m³, công nợ lưu kho và trạng thái vận hành theo thời gian thực."
      />

      <div className="card-flat" style={{ marginBottom: 16 }}>
        <Space wrap style={{ width: '100%' }}>
          <Input style={{ width: 360 }} prefix={<SearchOutlined />} placeholder="Tìm theo Mã KH (CUST-...), tên công ty, số điện thoại..."
            value={keyword} onChange={(e) => setKeyword(e.target.value)} allowClear />
          <Select style={{ width: 170 }} defaultValue="all" options={[{ value: 'all', label: 'Gói dịch vụ: Tất cả' }, { value: 'ENTERPRISE', label: 'Enterprise' }, { value: 'PRO', label: 'Pro' }, { value: 'STANDARD', label: 'Standard' }]} />
          <Select style={{ width: 170 }} defaultValue="all" options={[{ value: 'all', label: 'Tình trạng phí: Tất cả' }, { value: 'PAID', label: 'Đã thanh toán' }, { value: 'DEBT', label: 'Nợ phí' }]} />
          <Select style={{ width: 170 }} defaultValue="all" options={[{ value: 'all', label: 'Trạng thái: Tất cả' }, { value: 'ACTIVE', label: 'Active' }, { value: 'LOCKED', label: 'Locked' }]} />
          <Button icon={<ReloadOutlined />} onClick={() => setKeyword('')}>Đặt lại</Button>
        </Space>
        <div className="text-muted" style={{ textAlign: 'right' }}>Hiển thị {filtered.length} trên 148 đối tác</div>
      </div>

      <Table rowKey="id" loading={loading} columns={columns} dataSource={filtered}
        rowClassName={(r) => (r.account === 'LOCKED' ? 'row-danger' : '')}
        scroll={{ x: 1100 }}
        pagination={{ total: 148, pageSize: 20, showSizeChanger: true, pageSizeOptions: [10, 20, 50, 100], showTotal: (t) => `Tổng cộng ${t} khách hàng` }} />

      <ConfirmModal open={!!lockTarget} danger={lockTarget?.account !== 'LOCKED'}
        title={lockTarget?.account === 'LOCKED' ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
        content={`Bạn có chắc muốn ${lockTarget?.account === 'LOCKED' ? 'mở khóa' : 'khóa'} tài khoản ${lockTarget?.name}?`}
        onOk={toggleLock} onCancel={() => setLockTarget(null)} />

      <CustomerDetailDrawer open={detail.open} customer={detail.customer}
        onClose={() => setDetail((d) => ({ ...d, open: false }))}
        onCreateInvoice={(c) => navigate('/invoices', { state: { createFor: c.id } })}
        onRenew={setRenewTarget} />

      <CustomerCreateModal open={createOpen} nextCode={`CUST-VN${String(rows.length + 1).padStart(2, '0')}`}
        onClose={() => setCreateOpen(false)} onCreated={(row) => setRows((rs) => [...rs, row])} />

      <ConfirmModal open={!!renewTarget} title="Gia hạn hợp đồng"
        content={`Gia hạn hợp đồng của ${renewTarget?.name} thêm 12 tháng?`}
        onOk={renewContract} onCancel={() => setRenewTarget(null)} />
    </div>
  )
}
