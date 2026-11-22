import { useEffect, useMemo, useState } from 'react'
import { Layout, Input, Select, Badge, Avatar, Dropdown } from 'antd'
import { BellOutlined, SearchOutlined, BankOutlined, DownOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ROLES } from '../constants/roles'
import emailApi from '../api/emailApi'
import { USE_MOCK } from '../api/axiosClient'

export default function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [recentEmails, setRecentEmails] = useState([])
  const [emailFailureCount, setEmailFailureCount] = useState(0)

  useEffect(() => {
    if (user.role !== ROLES.ADMIN || USE_MOCK) return
    let active = true
    Promise.all([
      emailApi.getHistory({ page: 0, size: 5 }),
      emailApi.getHistory({ page: 0, size: 1, status: 'FAILED' }),
    ])
      .then(([recent, failed]) => {
        if (active) {
          setRecentEmails(recent.items)
          setEmailFailureCount(failed.totalElements)
        }
      })
      .catch(() => { if (active) { setRecentEmails([]); setEmailFailureCount(0) } })
    return () => { active = false }
  }, [user.role])

  const menu = {
    items: [
      { key: 'profile', label: 'Hồ sơ cá nhân' },
      { key: 'logout', label: 'Đăng xuất', danger: true },
    ],
    onClick: ({ key }) => {
      if (key === 'logout') { logout(); navigate('/login') }
    },
  }

  const emailMenu = useMemo(() => ({
    items: [
      { key: 'history', label: 'Mở lịch sử gửi email' },
      ...(recentEmails.length ? [{ type: 'divider' }, ...recentEmails.map((email) => ({
        key: `email-${email.id}`,
        label: `${email.status === 'FAILED' ? 'Thất bại' : email.status === 'SENT' ? 'Đã gửi' : 'Đang xử lý'} · ${email.subject}`,
      }))] : []),
    ],
    onClick: () => navigate('/emails'),
  }), [recentEmails, navigate])

  return (
    <Layout.Header
      style={{
        height: 56, lineHeight: '56px', padding: '0 24px', display: 'flex', alignItems: 'center',
        gap: 16, background: '#f3f4f6', color: '#263238', borderBottom: '1px solid #dedfe3', position: 'sticky', top: 0, zIndex: 10,
      }}
    >
      <Input
        prefix={<SearchOutlined />}
        placeholder={
          user.role === ROLES.STAFF
            ? 'Tìm nhanh mã phiếu, SKU, vị trí Bin/Rack (F2)...'
            : 'Tìm mã SKU, đơn nhập, vận đơn COD, đối tác (Ctrl+K)...'
        }
        style={{ maxWidth: 420, background: '#eff4ff' }}
        variant="filled"
      />
      <div style={{ flex: 1 }} />
      <Select
        defaultValue="tb01"
        variant="filled"
        suffixIcon={<BankOutlined />}
        style={{ width: 190 }}
        options={[{ value: 'tb01', label: 'Kho Tân Bình - Hub 01' }]}
      />
      {user.role === ROLES.ADMIN ? (
        <Dropdown menu={emailMenu} trigger={['click']}>
          <span style={{ cursor: 'pointer' }}><Badge count={emailFailureCount} offset={[-2, 4]}>
            <BellOutlined style={{ fontSize: 18 }} />
          </Badge></span>
        </Dropdown>
      ) : user.role === ROLES.STAFF
        ? <BellOutlined style={{ fontSize: 18 }} />
        : <Badge count={6} dot offset={[-2, 4]}><BellOutlined style={{ fontSize: 18 }} /></Badge>}
      <Dropdown menu={menu} trigger={['click']}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', lineHeight: 1.3 }}>
          <Avatar style={{ background: '#0057c2' }}>{user.name[0]}</Avatar>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{user.name}</div>
            <div className="text-muted" style={{ fontSize: 11 }}>{user.org}</div>
          </div>
          <DownOutlined style={{ fontSize: 10 }} />
        </div>
      </Dropdown>
    </Layout.Header>
  )
}
