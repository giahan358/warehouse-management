import { Menu } from 'antd'
import { useEffect, useState } from 'react'
import {
  AppstoreOutlined, ShopOutlined, InboxOutlined, ImportOutlined,
  ExportOutlined, FileTextOutlined, SafetyCertificateOutlined, ContainerOutlined,
  CheckSquareOutlined, AimOutlined, MailOutlined
} from '@ant-design/icons'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ROLES } from '../constants/roles'
import dashboardApi from '../api/dashboardApi'
import { USE_MOCK } from '../api/axiosClient'

const ADMIN_CUSTOMER = [ROLES.ADMIN, ROLES.CUSTOMER]
const ADMIN = [ROLES.ADMIN]
const STAFF = [ROLES.STAFF]

const groups = [
  {
    title: 'ĐIỀU HÀNH KHO',
    items: [
      { key: '/', label: 'Tổng quan hệ thống', icon: <AppstoreOutlined />, roles: ADMIN_CUSTOMER },
      { key: '/customers', label: 'Quản lý khách hàng', icon: <ShopOutlined />, roles: ADMIN },
      { key: '/inventory', label: 'Danh mục & Tồn kho', icon: <InboxOutlined />, roles: ADMIN },
      { key: '/inbound', label: 'Quản lý Nhập kho', icon: <ImportOutlined />, roles: ADMIN },
      { key: '/outbound', label: 'Xuất kho & COD', icon: <ExportOutlined />, roles: ADMIN },
    ],
  },
  {
    title: 'TÀI CHÍNH & HỆ THỐNG',
    items: [
      { key: '/invoices', label: 'Hóa đơn & Phí VNPay', icon: <FileTextOutlined />, roles: ADMIN },
      { key: '/users', label: 'Tài khoản & Phân quyền', icon: <SafetyCertificateOutlined />, roles: ADMIN },
      { key: '/emails', label: 'Lịch sử gửi email', icon: <MailOutlined />, roles: ADMIN },
    ],
  },
  {
    title: 'VẬN HÀNH TẠI CHỖ',
    items: [
      { key: '/', label: 'Bàn làm việc & Nhiệm vụ ca', icon: <AppstoreOutlined />, roles: STAFF },
      { key: '/staff/inbound', label: 'Tiếp nhận & Lịch nhập kho', icon: <ImportOutlined />, roles: STAFF },
      { key: '/staff/counting', label: 'Kiểm đếm & Xác nhận thực tế', icon: <CheckSquareOutlined />, roles: STAFF },
      { key: '/staff/outbound', label: 'Chuẩn bị & Xuất kho', icon: <ExportOutlined />, roles: STAFF },
      { key: '/staff/inventory', label: 'Tra cứu tồn kho & Vị trí', icon: <AimOutlined />, roles: STAFF },
    ],
  },
]

export default function Sidebar({ collapsed }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isStaff = user.role === ROLES.STAFF
  const [zoneA, setZoneA] = useState(null)

  useEffect(() => {
    if (user.role !== ROLES.ADMIN || USE_MOCK) return
    let active = true
    dashboardApi.getZoneUsage()
      .then((zones) => { if (active) setZoneA(zones.find((zone) => zone.zone === 'A') ?? null) })
      .catch(() => { if (active) setZoneA(null) })
    return () => { active = false }
  }, [user.role])

  const items = groups
    .map((g) => ({
      type: 'group',
      label: collapsed ? null : g.title,
      key: g.title,
      children: g.items
        .filter((i) => i.roles.includes(user.role))
        .map(({ key, label, icon }) => ({ key, label, icon })),
    }))
    .filter((g) => g.children.length)

  // Chọn mục khớp prefix dài nhất (vd /staff/counting/NK-... → /staff/counting)
  const selected = items
    .flatMap((g) => g.children.map((c) => c.key))
    .filter((k) => (k === '/' ? pathname === '/' : pathname === k || pathname.startsWith(`${k}/`)))
    .sort((a, b) => b.length - a.length)[0]

  return (
    <>
      <div className="sider-brand">
        <ContainerOutlined style={{ fontSize: 24, color: '#0057c2' }} />
        {!collapsed && (
          <div>
            <b>LogiStorage</b>
            <div className="eyebrow" style={{ fontSize: 10 }}>
              {isStaff ? 'Hệ thống Kho Thực địa' : 'WMS & Storage Pro'}
            </div>
          </div>
        )}
      </div>
      {!collapsed && user.role === ROLES.ADMIN && (
        <div className="warehouse-switch">
          <b>Kho Tân Bình Central</b>
          <span className="text-muted">
            {zoneA?.usedPercent == null ? 'Zone A - Chưa cấu hình sức chứa' : `Zone A - ${zoneA.usedPercent}% Tải`}
          </span>
        </div>
      )}
      <Menu
        mode="inline"
        selectedKeys={selected ? [selected] : []}
        items={items}
        onClick={({ key }) => navigate(key)}
        style={{ border: 'none', padding: '0 8px' }}
      />
      
    </>
  )
}
