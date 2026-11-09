import { useState } from 'react'
import { Button, Form, Input, Modal, Radio, Select, message } from 'antd'
import { AuditOutlined } from '@ant-design/icons'
import inventoryApi from '../../api/inventoryApi'
import PopupHeader, { modalStyles } from '../common/PopupHeader'
import { auditZoneOptions } from '../../mocks/popupData'

// Modal "Tạo phiếu kiểm kê kho"
export default function AuditModal({ open, onClose }) {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    const v = await form.validateFields()
    setSubmitting(true)
    try {
      const audit = await inventoryApi.createAudit(v)
      message.success(`Đã tạo phiếu kiểm kê ${audit.id}`)
      onClose()
    } catch (e) {
      message.error(e?.response?.data?.message ?? 'Không thể tạo phiếu kiểm kê')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onCancel={onClose} width={560} centered afterClose={() => form.resetFields()}
      styles={modalStyles}
      title={<PopupHeader icon={<AuditOutlined />} title="Tạo Phiếu Kiểm Kê Kho" subtitle="Kiểm kê định kỳ hoặc đột xuất theo phân vùng Bin/Rack" />}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onClose}>Hủy Bỏ</Button>
          <Button type="primary" loading={submitting} onClick={handleSubmit}>Tạo Phiếu</Button>
        </div>
      }>
      <Form form={form} layout="vertical" initialValues={{ zone: 'ALL', type: 'ROLLING' }}>
        <Form.Item name="zone" label="Phân vùng kiểm kê" rules={[{ required: true }]}>
          <Select options={auditZoneOptions} />
        </Form.Item>
        <Form.Item name="type" label="Hình thức kiểm kê" rules={[{ required: true }]}>
          <Radio.Group options={[{ value: 'ROLLING', label: 'Kiểm kê cuốn chiếu' }, { value: 'FULL', label: 'Kiểm kê toàn diện' }]} />
        </Form.Item>
        <Form.Item name="note" label="Ghi chú / Mục đích" style={{ marginBottom: 0 }}>
          <Input.TextArea rows={2} placeholder="Nhập lý do kiểm kê đột xuất hoặc định kỳ..." />
        </Form.Item>
      </Form>
    </Modal>
  )
}
