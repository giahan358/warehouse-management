import { useEffect, useState } from 'react'
import { Avatar, Button, Input, Select, Space, Table, Tag } from 'antd'
import {
  UserAddOutlined, SearchOutlined, ClearOutlined, DeleteOutlined, SafetyOutlined,
  ShopOutlined, TeamOutlined,
} from '@ant-design/icons'
import userApi from '../../api/userApi'
import PageHeader from '../../components/common/PageHeader'
import StatusTag from '../../components/common/StatusTag'
import ConfirmModal from '../../components/common/ConfirmModal'
import UserCreateModal from '../../components/forms/UserCreateModal'
import UserPermissionModal from '../../components/forms/UserPermissionModal'
import { ACCOUNT_STATUS } from '../../constants/statuses'
import { ROLES, ROLE_LABELS } from '../../constants/roles'

const ROLE_STYLE = {
  ADMIN: { icon: <SafetyOutlined />, color: '#93000a', bg: '#ffdad6' },
  CUSTOMER: { icon: <ShopOutlined />, color: '#0057c2', bg: '#dce9ff' },
  STAFF: { icon: <TeamOutlined />, color: '#0057c2', bg: '#dce9ff' },
}

export default function UserListPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [role, setRole] = useState('all')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [permission, setPermission] = useState({ open: false, user: null })

  useEffect(() => { userApi.getAll().then((d) => { setRows(d); setLoading(false) }) }, [])

  const unlock = (id) => // TODO: PATCH /users/{id}/status
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status: 'ACTIVE' } : r)))

  const data = rows.filter((r) =>
    (role === 'all' || r.role === role) &&
    `${r.name} ${r.email} ${r.id}`.toLowerCase().includes(keyword.toLowerCase()))

  const columns = [
    {
      title: 'TÀI KHOẢN & EMAIL', width: 300,
      render: (_, r) => (
        <Space>
          <Avatar style={{ background: r.status === 'LOCKED' ? '#ffdad6' : '#dce9ff', color: r.status === 'LOCKED' ? '#ba1a1a' : '#0057c2' }}>
            {r.name.split(' ').slice(-2).map((w) => w[0]).join('')}
          </Avatar>
          <div style={{ lineHeight: 1.3 }}>
            <b>{r.name}</b>
            <div className="text-muted">{r.email} <span className="chip" style={{ color: '#414755' }}>{r.provider}</span></div>
          </div>
        </Space>
      ),
    },
    { title: 'MÃ ĐỊNH DANH', dataIndex: 'id', render: (v) => <span className="mono-link">{v}</span> },
    {
      title: 'VAI TRÒ (ROLE)', dataIndex: 'role',
      render: (v) => {
        const s = ROLE_STYLE[v]
        return <Tag icon={s.icon} style={{ color: s.color, background: s.bg, border: 'none' }}>{ROLE_LABELS[v]}</Tag>
      },
    },
    { title: 'TỔ CHỨC / ĐƠN VỊ LIÊN KẾT', dataIndex: 'org' },
    { title: 'TRẠNG THÁI', dataIndex: 'status', align: 'center', render: (v) => <StatusTag map={ACCOUNT_STATUS} status={v} /> },
    {
      title: 'THAO TÁC', align: 'right',
      render: (_, r) => (
        <Space>
          {r.status === 'LOCKED'
            ? <Button size="small" type="primary" style={{ background: '#006767' }} onClick={() => unlock(r.id)}>Mở khóa</Button>
            : <Button size="small" style={{ background: '#dce9ff', color: '#0057c2', border: 'none' }} onClick={() => setPermission({ open: true, user: r })}>Phân quyền</Button>}
          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => setDeleteTarget(r)} />
        </Space>
      ),
    },
  ]

  return (
    <div className="page">
      <PageHeader
        eyebrow="PORTAL QUẢN TRỊ / HỆ THỐNG & BẢO MẬT / QUẢN LÝ TÀI KHOẢN & PHÂN QUYỀN"
        title="Quản trị Tài khoản & Phân quyền Hệ thống"
        extra={<Button type="primary" size="large" icon={<UserAddOutlined />} onClick={() => setCreateOpen(true)}>Tạo tài khoản mới (POST /users)</Button>}
      />

      <div className="card-flat" style={{ marginBottom: 16 }}>
        <Space wrap style={{ width: '100%' }}>
          <Input style={{ width: 320 }} prefix={<SearchOutlined />} placeholder="Tìm tên, email, SĐT, mã USR-..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          <Select style={{ width: 170 }} value={role} onChange={setRole}
            options={[{ value: 'all', label: 'Tất cả Vai trò' }, ...Object.values(ROLES).map((v) => ({ value: v, label: ROLE_LABELS[v] }))]} />
          <Select style={{ width: 190 }} defaultValue="all" options={[{ value: 'all', label: 'Tất cả Phương thức' }, { value: 'Google', label: 'Google' }, { value: 'Email', label: 'Email' }]} />
          <Select style={{ width: 170 }} defaultValue="all" options={[{ value: 'all', label: 'Tất cả Trạng thái' }, { value: 'ACTIVE', label: 'Active' }, { value: 'LOCKED', label: 'Locked' }]} />
          <Button icon={<ClearOutlined />} onClick={() => { setKeyword(''); setRole('all') }}>Đặt lại</Button>
          <Button type="primary" icon={<SearchOutlined />}>Tìm kiếm</Button>
        </Space>
      </div>

      <div className="card-flat" style={{ padding: 0 }}>
        <div style={{ padding: 16 }}>
          <b>Danh mục Người dùng & Ủy quyền</b> <span className="chip">Hiển thị {data.length} / 182 kết quả</span>
        </div>
        <Table rowKey="id" loading={loading} columns={columns} dataSource={data} rowSelection={{}}
          rowClassName={(r) => (r.status === 'LOCKED' ? 'row-danger' : '')} scroll={{ x: 1000 }}
          pagination={{ total: 182, pageSize: 10, showSizeChanger: true, showTotal: (t) => `Tổng cộng ${t} bản ghi`, style: { padding: '0 16px' } }} />
      </div>

      <ConfirmModal open={!!deleteTarget} danger title="Xóa tài khoản"
        content={`Bạn có chắc muốn xóa tài khoản ${deleteTarget?.name}?`}
        onOk={() => { setRows((rs) => rs.filter((r) => r.id !== deleteTarget.id)); setDeleteTarget(null) }}
        onCancel={() => setDeleteTarget(null)} />

      <UserCreateModal open={createOpen} nextCustomerCode={`CUST-B2B-${String(100 + rows.filter((r) => r.role === 'CUSTOMER').length).padStart(4, '0')}`}
        onClose={() => setCreateOpen(false)} onCreated={(row) => setRows((rs) => [row, ...rs])} />
      <UserPermissionModal open={permission.open} user={permission.user}
        onClose={() => setPermission((p) => ({ ...p, open: false }))} />
    </div>
  )
}
