import { useEffect, useState } from 'react'
import { Button, Form, Input, InputNumber, Modal, Select, message } from 'antd'
import { VerticalAlignTopOutlined } from '@ant-design/icons'
import inventoryApi from '../../api/inventoryApi'
import PopupHeader, { modalStyles } from '../common/PopupHeader'
import { relocationZoneOptions } from '../../mocks/popupData'

const required = (msg) => [{ required: true, message: msg }]
const upper = (v) => (typeof v === 'string' ? v.toUpperCase() : v)

// Modal "Điều chuyển vị trí lưu kho" — 1 SKU (có số lượng) hoặc nhiều SKU (hàng loạt)
export default function RelocationModal({ open, targets = [], onClose, onDone }) {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const single = targets.length === 1 ? targets[0] : null

  useEffect(() => { if (open) form.setFieldsValue({ quantity: single?.onHand }) }, [open, single, form])

  const handleSubmit = async () => {
    const v = await form.validateFields()
    setSubmitting(true)
    try {
      await inventoryApi.relocate({ skus: targets.map((t) => t.sku), ...v })
      message.success(`Đã gửi lệnh điều chuyển tới thiết bị cầm tay (Handheld PDA) của tổ xe nâng Zone ${v.zone}!`)
      onDone?.()
      onClose()
    } catch (e) {
      message.error(e?.response?.data?.message ?? 'Không thể xuất lệnh điều chuyển')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onCancel={onClose} width={520} centered afterClose={() => form.resetFields()}
      styles={modalStyles}
      title={<PopupHeader icon={<VerticalAlignTopOutlined />} title="Điều Chuyển Vị Trí Lưu Kho" />}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onClose}>Hủy Bỏ</Button>
          <Button type="primary" loading={submitting} onClick={handleSubmit}>Xác Nhận & Xuất Lệnh Xe Nâng</Button>
        </div>
      }>
      <div style={{ background: '#eff4ff', borderRadius: 8, padding: 12, marginBottom: 16 }}>
        {single ? (
          <>
            <div>Mã SKU: <b className="mono-link">{single.sku}</b></div>
            <div>Vị trí hiện tại: <span className="chip mono">{single.bin}</span></div>
          </>
        ) : (
          <div>Điều chuyển hàng loạt <b>{targets.length}</b> mã SKU: <span className="mono">{targets.map((t) => t.sku).join(', ')}</span></div>
        )}
      </div>

      <Form form={form} layout="vertical" initialValues={{ zone: 'A' }}>
        <Form.Item name="zone" label="Chọn Khu Vực Đích (Target Zone)" rules={required('Chọn khu vực đích')}>
          <Select options={relocationZoneOptions} />
        </Form.Item>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', columnGap: 12 }}>
          <Form.Item name="rack" label="Rack (Dãy)" getValueFromEvent={(e) => upper(e.target.value)} rules={[...required('Nhập dãy'), { pattern: /^R\d{2}$/, message: 'VD: R06' }]}>
            <Input className="mono" placeholder="R06" maxLength={3} />
          </Form.Item>
          <Form.Item name="shelf" label="Shelf (Tầng)" getValueFromEvent={(e) => upper(e.target.value)} rules={[...required('Nhập tầng'), { pattern: /^S\d{2}$/, message: 'VD: S03' }]}>
            <Input className="mono" placeholder="S03" maxLength={3} />
          </Form.Item>
          <Form.Item name="bin" label="Bin (Ô vị trí)" getValueFromEvent={(e) => upper(e.target.value)} rules={[...required('Nhập ô'), { pattern: /^B\d{2}$/, message: 'VD: B08' }]}>
            <Input className="mono" placeholder="B08" maxLength={3} />
          </Form.Item>
        </div>
        {single && (
          <Form.Item name="quantity" label="Số lượng điều chuyển (Units)"
            rules={[...required('Nhập số lượng'), { type: 'number', min: 1, max: single.onHand, message: `Từ 1 đến ${single.onHand} (tồn thực tế)` }]}>
            <InputNumber min={1} max={single.onHand || undefined} precision={0} style={{ width: '100%' }} />
          </Form.Item>
        )}
        <Form.Item name="reason" label="Lý do điều chuyển" style={{ marginBottom: 0 }}>
          <Input.TextArea rows={2} placeholder="Nhập ghi chú cho nhân sự xe nâng..." />
        </Form.Item>
      </Form>
    </Modal>
  )
}
