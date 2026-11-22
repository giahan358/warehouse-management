import { useState } from 'react'
import { Alert, Button, Form, Input, message } from 'antd'
import { IdcardOutlined, LockOutlined, LoginOutlined, ShopOutlined } from '@ant-design/icons'
import { Navigate, useNavigate } from 'react-router-dom'
import authApi from '../../api/authApi'
import { useAuth } from '../../contexts/AuthContext'
import { ROLES } from '../../constants/roles'
import { clearAccessToken } from '../../api/authToken'

export default function CustomerLoginPage() {
  const { user, isAuthenticated, isLoading: authLoading, login } = useAuth()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  if (authLoading) return <div style={{ display: 'grid', minHeight: '50vh', placeItems: 'center' }}>Đang kiểm tra phiên đăng nhập...</div>
  if (isAuthenticated) return <Navigate to={user?.role === ROLES.CUSTOMER ? '/customer/overview' : '/'} replace />

  const onFinish = async ({ email, password }) => {
    setLoading(true)
    setError(null)
    try {
      const authenticatedUser = await authApi.login(email.trim(), password)
      if (authenticatedUser.role !== ROLES.CUSTOMER) {
        clearAccessToken()
        setError('Cổng này dành cho tài khoản khách hàng. Admin và nhân viên kho vui lòng dùng cổng đăng nhập nội bộ.')
        return
      }
      login(authenticatedUser)
      message.success(`Xin chào ${authenticatedUser.name}`)
      navigate('/customer/overview', { replace: true })
    } catch (e) {
      setError(e?.response?.data?.error?.message ?? e?.response?.data?.message ?? e?.message ?? 'Không thể đăng nhập, vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: 660 }}>
      <div style={{ background: '#fff', border: '1px solid #e5eeff', borderRadius: 12, padding: 32, boxShadow: '0 4px 16px rgba(11,28,48,.06)' }}>
        <div className="eyebrow" style={{ color: '#0057c2' }}><ShopOutlined /> Cổng thông tin khách hàng LogiStorage</div>
        <h1 style={{ margin: '8px 0 4px', fontSize: 26, fontWeight: 600 }}>Đăng nhập Khách hàng</h1>
        <div className="text-muted" style={{ fontSize: 14, marginBottom: 16 }}>Tra cứu hàng hóa và quản lý dịch vụ kho của doanh nghiệp</div>

        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

        <Form form={form} layout="vertical" requiredMark onFinish={onFinish} onValuesChange={() => error && setError(null)}>
          <Form.Item name="email" label="Email tài khoản" normalize={(value) => value?.trim()}
            rules={[{ required: true, message: 'Vui lòng nhập email' }, { type: 'email', message: 'Email không hợp lệ' }]}>
            <Input size="large" prefix={<IdcardOutlined />} placeholder="name@company.vn" autoComplete="username" className="mono" />
          </Form.Item>
          <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}>
            <Input.Password size="large" prefix={<LockOutlined />} placeholder="••••••••" autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" block loading={loading} icon={<LoginOutlined />}>
            Đăng nhập Cổng Khách hàng
          </Button>
        </Form>
      </div>
    </div>
  )
}
