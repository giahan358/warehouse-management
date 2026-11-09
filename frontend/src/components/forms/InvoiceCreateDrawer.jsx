import { useEffect, useMemo, useState } from 'react'
import { Button, DatePicker, Drawer, Form, InputNumber, Radio, Select, message } from 'antd'
import { CheckCircleOutlined, FileAddOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import customerApi from '../../api/customerApi'
import invoiceApi from '../../api/invoiceApi'
import PopupHeader, { drawerStyles } from '../common/PopupHeader'
import { FEE_RATES, VAT_RATE } from '../../mocks/popupData'
import { formatCurrency } from '../../utils/formatCurrency'

const FEE_LINES = [
  { name: 'qtyStorage', code: 'STORAGE', label: 'Thuê kho (m³/ngày):', itemName: 'Thuê dung tích lưu kho sàn', unit: 'm³', rate: FEE_RATES.storage, placeholder: 'Số m³' },
  { name: 'qtyInbound', code: 'INBOUND', label: 'Nâng hạ xe cont Inbound:', itemName: 'Phí xe nâng & Dỡ hàng Cont Inbound', unit: 'xe', rate: FEE_RATES.inbound, placeholder: 'Số lượt xe' },
  { name: 'qtyPacking', code: 'PACKING', label: 'Đóng gói dán tem Outbound:', itemName: 'Phí hoàn tất đóng gói & In tem Outbound', unit: 'kiện', rate: FEE_RATES.packing, placeholder: 'Số kiện' },
]

const PAYMENT_OPTIONS = [
  { value: 'VNPAY', label: 'VNPay Sandbox' },
  { value: 'COD', label: 'Cấn trừ Quỹ COD' },
  { value: 'BANK', label: 'Chuyển khoản B2B' },
]

const initialValues = () => ({
  fromDate: dayjs().startOf('month'),
  toDate: dayjs().endOf('month'),
  qtyStorage: 300,
  qtyInbound: 4,
  qtyPacking: 500,
  paymentMethod: 'VNPAY',
})

// Drawer "Lập hóa đơn cước dịch vụ mới" — POST /invoices
export default function InvoiceCreateDrawer({ open, onClose, onCreated, defaultCustomerId }) {
  const [form] = Form.useForm()
  const [customers, setCustomers] = useState([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { customerApi.getAll().then(setCustomers) }, [])

  useEffect(() => {
    if (open && defaultCustomerId) form.setFieldsValue({ customerId: defaultCustomerId })
  }, [open, defaultCustomerId, form])

  const values = Form.useWatch([], form) ?? {}
  const fromDate = Form.useWatch('fromDate', form)
  const paymentMethod = Form.useWatch('paymentMethod', form)

  const { subtotal, vat, total } = useMemo(() => {
    const sub = FEE_LINES.reduce((s, l) => s + (values[l.name] || 0) * l.rate, 0)
    const v = Math.round(sub * VAT_RATE)
    return { subtotal: sub, vat: v, total: sub + v }
  }, [values])

  const handleSubmit = async () => {
    const v = await form.validateFields()
    if (total <= 0) {
      message.warning('Vui lòng nhập ít nhất một hạng mục phí lớn hơn 0')
      return
    }
    const customer = customers.find((c) => c.id === v.customerId)
    setSubmitting(true)
    try {
      const row = await invoiceApi.create({
        customerId: v.customerId,
        customerName: customer?.name,
        tax: customer?.tax,
        fromDate: v.fromDate.format('YYYY-MM-DD'),
        toDate: v.toDate.format('YYYY-MM-DD'),
        paymentMethod: v.paymentMethod,
        items: FEE_LINES.map((l) => ({ code: l.code, name: l.itemName, unit: l.unit, quantity: v[l.name] || 0, unitPrice: l.rate }))
          .filter((i) => i.quantity > 0),
      })
      message.success(`Đã phát hành hóa đơn ${row.id}`)
      onCreated?.(row, v.paymentMethod)
      onClose()
    } catch (e) {
      message.error(e?.response?.data?.message ?? 'Không thể phát hành hóa đơn, vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={520}
      afterOpenChange={(o) => { if (!o) form.resetFields() }}
      styles={drawerStyles}
      title={<PopupHeader icon={<FileAddOutlined />} title="Lập Hóa Đơn Cước Dịch Vụ Mới"
        subtitle={<span className="mono">API: POST /api/v1/invoices (Kho Logistics)</span>} />}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onClose}>Hủy bỏ</Button>
          <Button type="primary" loading={submitting} onClick={handleSubmit}>
            {paymentMethod === 'VNPAY' ? 'Phát hành Hóa đơn & Tạo QR VNPay' : 'Phát hành Hóa đơn'}
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" initialValues={initialValues()} requiredMark>
        <Form.Item name="customerId" label="Khách Hàng Doanh Nghiệp (Chủ Hàng B2B)" rules={[{ required: true, message: 'Vui lòng chọn khách hàng' }]}>
          <Select placeholder="Chọn khách hàng B2B" showSearch optionFilterProp="label"
            options={customers.filter((c) => c.account !== 'LOCKED').map((c) => ({ value: c.id, label: `${c.name} (${c.id})` }))} />
        </Form.Item>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Form.Item name="fromDate" label="Từ ngày tính phí" rules={[{ required: true, message: 'Chọn ngày bắt đầu' }]}>
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="toDate" label="Đến ngày chốt biểu phí" dependencies={['fromDate']}
            rules={[
              { required: true, message: 'Chọn ngày chốt' },
              ({ getFieldValue }) => ({
                validator: (_, d) => (!d || !getFieldValue('fromDate') || !d.isBefore(getFieldValue('fromDate'), 'day')
                  ? Promise.resolve() : Promise.reject(new Error('Phải sau ngày bắt đầu'))),
              }),
            ]}>
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} disabledDate={(d) => !!fromDate && d.isBefore(fromDate, 'day')} />
          </Form.Item>
        </div>

        <div style={{ background: '#eff4ff', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Hạng Mục Biểu Phí Dịch Vụ Cấu Thành</div>
          {FEE_LINES.map((l) => (
            <div key={l.name} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 500 }}>{l.label}</span>
              <Form.Item name={l.name} noStyle>
                <InputNumber min={0} precision={0} placeholder={l.placeholder} style={{ width: '100%' }} />
              </Form.Item>
              <div className="mono" style={{ background: '#e5eeff', borderRadius: 6, padding: '4px 10px', textAlign: 'right', fontWeight: 600 }}>
                {formatCurrency((values[l.name] || 0) * l.rate)}
              </div>
            </div>
          ))}
        </div>

        <Form.Item name="paymentMethod" label="Phương thức thanh toán dự kiến" rules={[{ required: true }]}>
          <Radio.Group options={PAYMENT_OPTIONS} optionType="button" buttonStyle="solid" />
        </Form.Item>

        <div style={{ background: '#dce9ff', borderRadius: 8, padding: 16, textAlign: 'right' }}>
          <div>Tạm tính cước dịch vụ: <b className="mono">{formatCurrency(subtotal)}</b></div>
          <div>Thuế suất GTGT (8%): <b className="mono">{formatCurrency(vat)}</b></div>
          <div style={{ color: '#0057c2', fontWeight: 700, marginTop: 4 }}>
            <CheckCircleOutlined /> Tổng thanh toán: <span className="mono">{formatCurrency(total)}</span>
          </div>
        </div>
      </Form>
    </Drawer>
  )
}
