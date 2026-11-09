import { useState } from 'react'
import { Button, Form, Input, InputNumber, Modal, Select, message } from 'antd'
import { CheckOutlined, ApartmentOutlined } from '@ant-design/icons'
import customerApi from '../../api/customerApi'
import PopupHeader, { modalStyles } from '../common/PopupHeader'
import { hubOptions, planOptions } from '../../mocks/popupData'

const required = (msg) => [{ required: true, message: msg }]

// Modal "Thêm Khách Hàng Doanh Nghiệp Mới" — POST /customers
export default function CustomerCreateModal({ open, nextCode, onClose, onCreated }) {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    const v = await form.validateFields()
    setSubmitting(true)
    try {
      const row = await customerApi.create({
        taxCode: v.taxCode, name: v.name, representative: v.representative, phone: v.phone,
        email: v.email, plan: v.plan, capacity: v.capacity, hub: v.hub,
      })
      message.success(`Đã tạo hồ sơ khách hàng ${row.id}`)
      onCreated?.(row)
      onClose()
    } catch (e) {
      message.error(e?.response?.data?.message ?? 'Không thể tạo khách hàng, vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onCancel={onClose} width={680} centered afterClose={() => form.resetFields()}
      styles={modalStyles}
      title={<PopupHeader icon={<ApartmentOutlined />} title="Thêm Khách Hàng Doanh Nghiệp Mới"
        subtitle="Khởi tạo hồ sơ khách hàng, phân bổ dung lượng kho lưu trữ và tạo hợp đồng ban đầu." />}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onClose}>Hủy bỏ</Button>
          <Button type="primary" icon={<CheckOutlined />} loading={submitting} onClick={handleSubmit}>Lưu & Tạo Hồ Sơ Khách Hàng</Button>
        </div>
      }>
      <Form form={form} layout="vertical" initialValues={{ plan: 'PRO', capacity: 250 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 16 }}>
          <Form.Item label="Mã Khách Hàng (Tự động sinh)">
            <Input readOnly value={nextCode} className="mono" style={{ color: '#0057c2', fontWeight: 600, background: '#eff4ff' }} />
          </Form.Item>
          <Form.Item name="taxCode" label="Mã Số Thuế (MST) Doanh Nghiệp" rules={[...required('Nhập MST'), { pattern: /^\d{10}(-?\d{3})?$/, message: 'MST gồm 10 hoặc 13 chữ số' }]}>
            <Input placeholder="VD: 0312345678" />
          </Form.Item>
          <Form.Item name="name" label="Tên Doanh Nghiệp / Chủ Gian Hàng" rules={required('Nhập tên doanh nghiệp')}>
            <Input placeholder="VD: Công ty TNHH SunTech Việt Nam" />
          </Form.Item>
          <Form.Item name="representative" label="Họ Tên Người Đại Diện Pháp Lý" rules={required('Nhập người đại diện')}>
            <Input placeholder="VD: Nguyễn Văn A" />
          </Form.Item>
          <Form.Item name="phone" label="Số Điện Thoại Trực Vận Hành" rules={[...required('Nhập số điện thoại'), { pattern: /^(0|\+84)[\d\s]{9,12}$/, message: 'Số điện thoại không hợp lệ' }]}>
            <Input placeholder="VD: 0908 123 456" />
          </Form.Item>
          <Form.Item name="email" label="Email Nhận Hóa Đơn Điện Tử (VAT)" rules={[...required('Nhập email'), { type: 'email', message: 'Email không hợp lệ' }]}>
            <Input placeholder="ketoan@suntech.vn" />
          </Form.Item>
          <Form.Item name="plan" label="Gói Hợp Đồng Lưu Kho" rules={required('Chọn gói')}>
            <Select options={planOptions} />
          </Form.Item>
          <Form.Item name="capacity" label="Dung Lượng Thuê Cam Kết (m³)" rules={[...required('Nhập dung lượng'), { type: 'number', min: 1, message: 'Tối thiểu 1 m³' }]}>
            <InputNumber min={1} precision={0} style={{ width: '100%' }} />
          </Form.Item>
        </div>
        <Form.Item name="hub" label="Chỉ Định Phân Khu (Warehouse Hub)" rules={required('Chọn phân khu')} style={{ marginBottom: 0 }}>
          <Select placeholder="Chọn kho / phân khu" options={hubOptions} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
