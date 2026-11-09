import { Layout, Input, Select, Badge, Avatar, Dropdown } from 'antd'
import { BellOutlined, SearchOutlined, BankOutlined, DownOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ROLES } from '../constants/roles'

export default function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const menu = {
    items: [
      { key: 'profile', label: 'Hồ sơ cá nhân' },
      { key: 'logout', label: 'Đăng xuất', danger: true },
    ],
    onClick: ({ key }) => {
      if (key === 'logout') { logout(); navigate('/login') }
    },
  }

  return (
    <Layout.Header
      style={{
        height: 56, lineHeight: '56px', padding: '0 24px', display: 'flex', alignItems: 'center',
        gap: 16, borderBottom: '1px solid #e5eeff', position: 'sticky', top: 0, zIndex: 10,
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
      <Badge count={user.role === ROLES.STAFF ? 6 : 1} dot={user.role !== ROLES.STAFF} offset={[-2, 4]}>
        <BellOutlined style={{ fontSize: 18 }} />
      </Badge>
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
