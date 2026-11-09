import { useState } from 'react'
import { Alert, Button, Divider, Form, Input, message } from 'antd'
import {
  GoogleOutlined, IdcardOutlined, LockOutlined, LoginOutlined, SafetyCertificateOutlined,
  StopOutlined, ClusterOutlined,
} from '@ant-design/icons'
import { Navigate, useNavigate } from 'react-router-dom'
import authApi, { MAX_FAILED_ATTEMPTS } from '../../api/authApi'
import { USE_MOCK } from '../../api/axiosClient'
import { accountsMock } from '../../mocks/accounts'
import { useAuth } from '../../contexts/AuthContext'
import { ROLES, ROLE_LABELS } from '../../constants/roles'

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Đã đăng nhập thì vào thẳng trang chủ theo role
  if (isAuthenticated) return <Navigate to="/" replace />

  const onFinish = async ({ email, password }) => {
    setLoading(true)
    setError(null)
    try {
      const user = await authApi.login(email.trim(), password)
      // Cổng này dành cho nhân sự nội bộ; khách hàng dùng cổng riêng
      if (user.role === ROLES.CUSTOMER) {
        setError('Đây là cổng đăng nhập nội bộ. Tài khoản khách hàng vui lòng dùng cổng dành cho khách hàng.')
        return
      }
      login(user)
      message.success(`Xin chào ${user.name}`)
      navigate('/', { replace: true })
    } catch (e) {
      setError(e?.message ?? e?.response?.data?.message ?? 'Không thể đăng nhập, vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: 660 }}>
      <div style={{ background: '#fff', border: '1px solid #e5eeff', borderRadius: 12, padding: 32, boxShadow: '0 4px 16px rgba(11,28,48,.06)' }}>
        <div className="eyebrow" style={{ color: '#0057c2' }}><ClusterOutlined /> Hệ thống quản trị & vận hành kho trung ương</div>
        <h1 style={{ margin: '8px 0 4px', fontSize: 26, fontWeight: 600 }}>Cổng Đăng Nhập Nội Bộ</h1>
        <div className="text-muted" style={{ fontSize: 14, marginBottom: 16 }}>Xác thực danh tính số LogiStorage WMS Enterprise Cluster</div>

        <div style={{ background: '#eff4ff', borderRadius: 10, padding: 6, marginBottom: 16 }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: '8px 0', textAlign: 'center', color: '#0057c2', fontWeight: 500, boxShadow: '0 1px 3px rgba(11,28,48,.08)' }}>
            <SafetyCertificateOutlined /> Quản trị viên / Nhân viên kho
          </div>
        </div>

        <Button block size="large" icon={<GoogleOutlined />} style={{ background: '#eff4ff', border: 'none' }}
          onClick={() => message.info('Đăng nhập Google Doanh nghiệp sẽ được bật ở bước sau')}>
          Đăng nhập nhanh qua Google
        </Button>
        <Divider plain style={{ fontSize: 12, color: '#414755' }}>Hoặc đăng nhập bằng Email nội bộ & Mật khẩu</Divider>

        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

        <Form form={form} layout="vertical" requiredMark onFinish={onFinish} onValuesChange={() => error && setError(null)}>
          <Form.Item
            name="email" label="Email tài khoản nhân sự"
            normalize={(value) => value?.trim()}
            rules={[{ required: true, message: 'Vui lòng nhập email' }, { type: 'email', message: 'Email không hợp lệ' }]}
          >
            <Input size="large" prefix={<IdcardOutlined />} placeholder="name@gmail.com" autoComplete="username" className="mono" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Mật khẩu hệ thống"
            extra={<a onClick={() => message.info('Vui lòng liên hệ Admin IT Support để cấp lại mật khẩu')}>Quên mật khẩu? Liên hệ Admin IT Support</a>}
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
          >
            <Input.Password size="large" prefix={<LockOutlined />} placeholder="••••••••" autoComplete="current-password" />
          </Form.Item>

          <Button type="primary" htmlType="submit" size="large" block loading={loading} icon={<LoginOutlined />}>
            Đăng nhập Hệ Thống Vận Hành
          </Button>
        </Form>

        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, background: '#eff4ff', borderRadius: 8, padding: '10px 14px', marginTop: 24, fontSize: 12 }}>
          <span style={{ color: '#ba1a1a' }}><StopOutlined /> Khóa tự động sau {MAX_FAILED_ATTEMPTS} lần nhập sai</span>
        </div>

        {USE_MOCK && (
          <div style={{ marginTop: 16, border: '1px dashed #c1c6d7', borderRadius: 8, padding: 12 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Tài khoản demo (chỉ hiện khi dùng mock)</div>
            {accountsMock.filter((a) => a.role !== ROLES.CUSTOMER).map((a) => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: 12 }}>
                <span>
                  <b>{ROLE_LABELS[a.role]}</b> — <span className="mono">{a.email}</span> / <span className="mono">{a.password}</span>
                </span>
                <a onClick={() => { form.setFieldsValue({ email: a.email, password: a.password }); setError(null) }}>Điền sẵn</a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}