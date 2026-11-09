import { Outlet } from 'react-router-dom'
import { ContainerOutlined } from '@ant-design/icons'

export default function AuthLayout() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8f9ff' }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #e5eeff', padding: '12px 32px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 8, background: '#0057c2', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 22 }}>
          <ContainerOutlined />
        </div>
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>LOGIX<span style={{ color: '#0057c2' }}>WMS</span></div>
          <div className="text-muted">Enterprise Cloud OS</div>
        </div>
      </header>

      <main style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 24 }}>
        <Outlet />
      </main>

      <footer style={{ textAlign: 'center', padding: '0 24px 24px' }}>
        <div className="text-muted" style={{ marginTop: 4 }}>
          Hệ thống chỉ dùng cho mục đích tác nghiệp nội bộ. Mọi quyền được bảo lưu bởi Tổng Công ty Dịch vụ Kho vận Thông minh LogiStorage Việt Nam.
        </div>
      </footer>
    </div>
  )
}
