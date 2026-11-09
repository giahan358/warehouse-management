import { useState } from 'react'
import { Button, Checkbox, Form, Input, InputNumber, Modal, Select, message } from 'antd'
import {
  BankOutlined, CheckCircleOutlined, IdcardOutlined, SafetyCertificateOutlined, SafetyOutlined,
  ShopOutlined, TeamOutlined, UserAddOutlined,
} from '@ant-design/icons'
import userApi from '../../api/userApi'
import PopupHeader, { modalStyles } from '../common/PopupHeader'
import { ROLES } from '../../constants/roles'
import { branchOptions, serviceTierOptions, shiftOptions, zoneAccessOptions } from '../../mocks/popupData'

const required = (msg) => [{ required: true, message: msg }]
const passwordRules = [...required('Nhập mật khẩu'), { min: 8, message: 'Mật khẩu ít nhất 8 ký tự' }]
const internalEmailRules = [...required('Nhập email công vụ'), { type: 'email', message: 'Email không hợp lệ' },
  { pattern: /@logistorage\.vn$/i, message: 'Phải dùng email @logistorage.vn' }]

const ROLE_CARDS = [
  { value: ROLES.CUSTOMER, icon: <ShopOutlined />, title: 'Khách hàng', code: 'ROLE_CUSTOMER', desc: 'Doanh nghiệp gửi hàng B2B', color: '#0057c2' },
  { value: ROLES.STAFF, icon: <TeamOutlined />, title: 'Nhân viên kho', code: 'ROLE_STAFF', desc: 'Vận hành kho, soạn hàng', color: '#466082' },
  { value: ROLES.ADMIN, icon: <SafetyOutlined />, title: 'Quản trị viên', code: 'ROLE_ADMIN', desc: 'Kiểm soát toàn quyền hệ thống', color: '#ba1a1a' },
]

function RoleCards({ value, onChange }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      {ROLE_CARDS.map((r) => {
        const active = value === r.value
        return (
          <button key={r.value} type="button" onClick={() => onChange?.(r.value)}
            style={{
              textAlign: 'left', cursor: 'pointer', padding: 10, borderRadius: 8, position: 'relative',
              border: `2px solid ${active ? '#0057c2' : '#c1c6d7'}`, background: active ? '#eff4ff' : '#fff',
            }}>
            <div style={{ color: r.color, fontSize: 18 }}>{r.icon}</div>
            {active && <span style={{ position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: '50%', background: '#0057c2' }} />}
            <div style={{ fontWeight: 600 }}>{r.title}</div>
            <div className="mono" style={{ fontSize: 11, color: r.color }}>{r.code}</div>
            <div className="text-muted">{r.desc}</div>
          </button>
        )
      })}
    </div>
  )
}

const Band = ({ icon, title, badge }) => (
  <div style={{ background: '#eff4ff', borderRadius: 8, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
    <b style={{ fontSize: 12 }}><span style={{ color: '#0057c2', marginRight: 6 }}>{icon}</span>{title}</b>
    <span className="chip">{badge}</span>
  </div>
)

const grid = (cols) => ({ display: 'grid', gridTemplateColumns: cols, columnGap: 12 })

// Modal "Tạo tài khoản mới & cấp quyền hệ thống" — POST /users
export default function UserCreateModal({ open, nextCustomerCode, onClose, onCreated }) {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const role = Form.useWatch('role', form) ?? ROLES.CUSTOMER

  const handleSubmit = async () => {
    const v = await form.validateFields()
    setSubmitting(true)
    try {
      const payload = role === ROLES.CUSTOMER
        ? {
            role, email: v.email, password: v.password, companyName: v.companyName, customerCode: nextCustomerCode,
            taxCode: v.taxCode, contactName: v.contactName, position: v.position, phone: v.phone,
            servicePlan: v.servicePlan, slaPallets: v.slaPallets, zones: v.zones ?? [], address: v.address,
          }
        : { role, fullName: v.fullName, email: v.email, password: v.password, ...(role === ROLES.STAFF ? { branch: v.branch, shift: v.shift } : {}) }
      const row = await userApi.create(payload)
      message.success(`Đã tạo tài khoản ${row.email}`)
      onCreated?.(row)
      onClose()
    } catch (e) {
      message.error(e?.response?.data?.message ?? 'Không thể tạo tài khoản, vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onCancel={onClose} width={720} centered afterClose={() => form.resetFields()}
      styles={{ ...modalStyles, body: { ...modalStyles.body, maxHeight: '68vh', overflowY: 'auto' } }}
      title={<PopupHeader icon={<UserAddOutlined />} title="Tạo tài khoản mới & Cấp quyền hệ thống"
        subtitle={<span>API Endpoint: <b className="mono" style={{ color: '#0057c2' }}>POST /api/v1/users</b></span>} />}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="text-muted"><SafetyCertificateOutlined style={{ color: '#006767' }} /> Thông tin sẽ được mã hóa và xác thực RBAC</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={onClose}>Hủy bỏ</Button>
            <Button type="primary" icon={<CheckCircleOutlined />} loading={submitting} onClick={handleSubmit}>Xác nhận tạo tài khoản</Button>
          </div>
        </div>
      }>
      <Form form={form} layout="vertical" initialValues={{ role: ROLES.CUSTOMER, servicePlan: 'PRO', slaPallets: 250, zones: ['A', 'B'], shift: 'DAY', branch: branchOptions[0].value }}>
        <Form.Item name="role" label="Chọn vai trò người dùng (User Role)" rules={required('Chọn vai trò')}>
          <RoleCards />
        </Form.Item>

        {role === ROLES.CUSTOMER ? (
          <>
            <Band icon={<BankOutlined />} title="Hồ sơ Khách hàng Doanh Nghiệp (B2B Tenant Profile)" badge="Hợp nhất Quản lý KH" />
            <div style={grid('1fr 1fr')}>
              <Form.Item name="email" label="Email đăng nhập" rules={[...required('Nhập email'), { type: 'email', message: 'Email không hợp lệ' }]}>
                <Input placeholder="corp.lead@company.vn" />
              </Form.Item>
              <Form.Item name="password" label="Mật khẩu khởi tạo" rules={passwordRules}>
                <Input.Password placeholder="Nhập ít nhất 8 ký tự" />
              </Form.Item>
            </div>
            <div style={grid('1fr 1fr')}>
              <Form.Item name="companyName" label="Tên doanh nghiệp / Đơn vị" rules={required('Nhập tên doanh nghiệp')}>
                <Input placeholder="Công ty Cổ phần / TNHH..." />
              </Form.Item>
              <div style={grid('1fr 1fr')}>
                <Form.Item label="Mã khách hàng">
                  <Input readOnly value={nextCustomerCode} className="mono" style={{ color: '#0057c2', fontWeight: 600, background: '#eff4ff' }} />
                </Form.Item>
                <Form.Item name="taxCode" label="Mã số thuế (MST)" rules={[...required('Nhập MST'), { pattern: /^\d{10}(-?\d{3})?$/, message: '10 hoặc 13 số' }]}>
                  <Input placeholder="0312xxxxxx" />
                </Form.Item>
              </div>
            </div>
            <div style={grid('1fr 1fr 1fr')}>
              <Form.Item name="contactName" label="Người đại diện liên hệ" rules={required('Nhập họ tên')}>
                <Input placeholder="Họ và tên" />
              </Form.Item>
              <Form.Item name="position" label="Chức vụ">
                <Input placeholder="Trưởng phòng Chuỗi cung ứng" />
              </Form.Item>
              <Form.Item name="phone" label="Số điện thoại Hotline" rules={[...required('Nhập số điện thoại'), { pattern: /^(0|\+84)[\d\s]{9,12}$/, message: 'Số điện thoại không hợp lệ' }]}>
                <Input placeholder="090x xxx xxx" />
              </Form.Item>
            </div>
            <div style={grid('1fr 1fr')}>
              <Form.Item name="servicePlan" label="Gói dịch vụ hợp đồng">
                <Select options={serviceTierOptions} />
              </Form.Item>
              <Form.Item label="Hạn mức SLA cam kết">
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Form.Item name="slaPallets" noStyle><InputNumber min={0} precision={0} style={{ width: '100%' }} /></Form.Item>
                  <span className="chip" style={{ padding: '4px 10px' }}>Pallet</span>
                </div>
              </Form.Item>
            </div>
            <Form.Item name="zones" label="Phân vùng lưu trữ được cấp phép (Zone Access)">
              <Checkbox.Group options={zoneAccessOptions} />
            </Form.Item>
            <Form.Item name="address" label="Địa chỉ trụ sở / Xuất hóa đơn VAT" rules={required('Nhập địa chỉ')} style={{ marginBottom: 0 }}>
              <Input placeholder="Địa chỉ đăng ký kinh doanh kèm mã tỉnh/thành..." />
            </Form.Item>
          </>
        ) : (
          <>
            <Band icon={<IdcardOutlined />} title="Thông tin nhân sự nội bộ (Internal Staff Profile)" badge={role === ROLES.ADMIN ? 'ROLE_ADMIN' : 'ROLE_STAFF'} />
            <div style={grid('1fr 1fr')}>
              <Form.Item name="fullName" label="Họ và tên nhân sự" rules={required('Nhập họ tên')}>
                <Input placeholder="Nguyễn Văn A" />
              </Form.Item>
              <Form.Item name="email" label="Email công vụ (@logistorage.vn)" rules={internalEmailRules}>
                <Input placeholder="staff.ten@logistorage.vn" />
              </Form.Item>
              <Form.Item name="password" label="Mật khẩu khởi tạo" rules={passwordRules}>
                <Input.Password placeholder="Mật khẩu ít nhất 8 ký tự" />
              </Form.Item>
              <Form.Item name="confirm" label="Xác nhận mật khẩu" dependencies={['password']}
                rules={[...required('Nhập lại mật khẩu'), ({ getFieldValue }) => ({
                  validator: (_, v) => (!v || v === getFieldValue('password') ? Promise.resolve() : Promise.reject(new Error('Mật khẩu không khớp'))),
                })]}>
                <Input.Password placeholder="Nhập lại mật khẩu" />
              </Form.Item>
            </div>
            {role === ROLES.STAFF && (
              <div style={grid('1fr 1fr')}>
                <Form.Item name="branch" label="Khu vực / Chi nhánh kho phụ trách" style={{ marginBottom: 0 }}>
                  <Select options={branchOptions} />
                </Form.Item>
                <Form.Item name="shift" label="Ca làm việc phân công" style={{ marginBottom: 0 }}>
                  <Select options={shiftOptions} />
                </Form.Item>
              </div>
            )}
          </>
        )}
      </Form>
    </Modal>
  )
}
