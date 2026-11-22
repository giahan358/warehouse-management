import { useEffect, useMemo, useState } from 'react'
import { Button, DatePicker, Form, Input, InputNumber, Modal, Select, message } from 'antd'
import { CheckCircleOutlined, DeleteOutlined, InboxOutlined, PlusOutlined, FileAddOutlined, CloseOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import customerApi from '../../api/customerApi'
import productApi from '../../api/productApi'
import inboundApi from '../../api/inboundApi'
import { USE_MOCK } from '../../api/axiosClient'
import { inventoryMock } from '../../mocks/data'
import { modalStyles } from '../common/PopupHeader'

// ===== Cấu hình =====
const DRAFT_KEY = 'asn-create-draft'

const DOCK_OPTIONS = [
  { value: 'D-01', label: 'Dock D-01 (Khu Hàng nhẹ / Parcel)' },
  { value: 'D-02', label: 'Dock D-02 (Khu Công nghệ & Điện tử)' },
  { value: 'D-03', label: 'Dock D-03 (Pallet & Hàng cồng kềnh)' },
  { value: 'D-Cold', label: 'Dock Lạnh C-01 (Dược phẩm & Mỹ phẩm)' },
]

const BASE_UNITS = ['Thùng', 'Kiện', 'Hộp', 'Cuộn', 'Chai', 'Bộ', 'Cái']

const GRID = '1.5fr 1.8fr 110px 110px 1.5fr 36px'

// ===== Helpers =====
const getPayload = (response) => response?.data?.data ?? response?.data ?? response

function getRows(response) {
  const payload = getPayload(response)
  if (Array.isArray(payload)) return payload
  return payload?.content ?? payload?.items ?? []
}

const errorText = (error, fallback) =>
  error?.response?.data?.error?.message ?? error?.response?.data?.message ?? error?.message ?? fallback

const customerName = (c) => c?.businessName ?? c?.name ?? c?.fullName ?? 'Khách hàng'

const label = (text, required) => (
  <span style={{ fontSize: 12, fontWeight: 500, color: '#0b1c30' }}>
    {text} {required && <span style={{ color: '#ba1a1a' }}>*</span>}
  </span>
)

const emptyItem = () => ({ productId: undefined, unit: undefined, expectedQuantity: 1, lineNote: '' })

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const d = JSON.parse(raw)
    return { ...d, expectedAt: d.expectedAt ? dayjs(d.expectedAt) : undefined }
  } catch { return null }
}

// ===== Component =====
export default function AsnCreateModal({ open, onClose, onCreated }) {
  const [form] = Form.useForm()
  const customerId = Form.useWatch('customerId', form)
  const expectedAt = Form.useWatch('expectedAt', form)
  const watchedItems = Form.useWatch('items', form)

  // customerRows = null nghĩa là chưa tải xong lần đầu (dùng để suy ra trạng thái loading)
  const [customerRows, setCustomerRows] = useState(null)
  // Kết quả tải sản phẩm gắn kèm customerId để biết nó có còn khớp với khách đang chọn không
  const [productRes, setProductRes] = useState({ customerId: null, rows: [] })
  const [submitting, setSubmitting] = useState(false)

  const customers = useMemo(() => customerRows ?? [], [customerRows])
  const mockProducts = useMemo(() => (
    USE_MOCK && customerId
      ? inventoryMock.map((p, i) => ({ id: i + 1, customerId, sku: p.sku, name: p.name, unit: p.unit }))
      : []
  ), [customerId])
  const products = useMemo(
    () => (USE_MOCK ? mockProducts : (productRes.customerId === customerId ? productRes.rows : [])),
    [mockProducts, productRes, customerId],
  )
  const loadingCustomers = open && customerRows === null
  const loadingProducts = !USE_MOCK && Boolean(customerId) && productRes.customerId !== customerId
  const loadingOptions = loadingCustomers || loadingProducts

  // Mở popup: nạp danh sách khách hàng + khôi phục bản nháp (nếu có)
  useEffect(() => {
    if (!open) return
    form.resetFields()
    const draft = loadDraft()
    if (draft) {
      form.setFieldsValue(draft)
      message.info('Đã khôi phục bản nháp gần nhất')
    }
    customerApi.getAll({ size: 100 })
      .then((response) => setCustomerRows(getRows(response)))
      .catch((error) => {
        message.error(errorText(error, 'Không tải được danh sách khách hàng'))
        setCustomerRows((current) => current ?? [])
      })
  }, [open, form])

  // Đổi khách hàng: nạp danh mục SKU của khách đó (mock thì dùng useMemo ở trên)
  useEffect(() => {
    if (USE_MOCK || !open || !customerId) return
    productApi.getProducts({ customerId, size: 100 })
      .then((response) => setProductRes({
        customerId,
        rows: getRows(response).filter((p) => String(p.customerId) === String(customerId)),
      }))
      .catch((error) => {
        message.error(errorText(error, 'Không tải được danh mục sản phẩm'))
        setProductRes({ customerId, rows: [] })
      })
  }, [open, customerId])

  const customerOptions = useMemo(() => customers.map((c) => ({
    value: c.id,
    label: `${customerName(c)}${c.code ? ` (${c.code})` : c.location ? ` (${c.location})` : ''}`,
  })), [customers])

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

  const productOptions = useMemo(() => products.map((p) => ({
    value: p.id, label: p.sku, name: p.name, search: `${p.sku} ${p.name}`,
  })), [products])

  const unitOptions = (productUnit) =>
    [...new Set([productUnit, ...BASE_UNITS].filter(Boolean))].map((u) => ({ value: u, label: u }))

  const codePrefix = `NK-${(expectedAt ?? dayjs()).format('YYYYMM')}-`

  // Đổi khách hàng thì xóa các dòng SKU cũ (vì SKU thuộc khách hàng khác)
  const onCustomerChange = () => form.setFieldValue('items', [emptyItem()])

  const onProductChange = (index, productId) => {
    const p = productMap.get(productId)
    form.setFieldValue(['items', index, 'unit'], p?.unit)
  }

  // ----- Lưu nháp (localStorage, chưa gọi API) -----
  const saveDraft = () => {
    try {
      const values = form.getFieldsValue()
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...values, expectedAt: values.expectedAt?.toISOString?.() }))
      message.success('Đã lưu bản nháp')
      onClose()
    } catch { message.error('Không thể lưu bản nháp') }
  }

  // ----- Xác nhận & tạo ASN -----
  const submit = async () => {
    let values
    try { values = await form.validateFields() } catch { return }

    // BE (CreateInboundReceiptRequest) chưa có field dock / loại xe / ghi chú từng dòng
    // => gộp vào `note` để kho vẫn thấy đầy đủ thông tin.
    const noteLines = [
      `[Dock đề xuất: ${values.dockCode}] [Phương tiện: ${values.vehicleType?.trim()}]`,
      values.note?.trim(),
      ...values.items
        .filter((it) => it.lineNote?.trim())
        .map((it) => `- ${productMap.get(it.productId)?.sku ?? it.productId}: ${it.lineNote.trim()}`),
    ].filter(Boolean)

    setSubmitting(true)
    try {
      const response = await inboundApi.createReceipt({
        customerId: USE_MOCK ? values.customerId : Number(values.customerId),
        expectedAt: values.expectedAt.format('YYYY-MM-DDTHH:mm:ss'),
        vehiclePlate: values.vehiclePlate?.trim() || undefined,
        timeSlot: values.expectedAt.hour() < 12 ? 'MORNING' : 'AFTERNOON',
        note: noteLines.join('\n'),
        items: values.items.map((it) => ({
          productId: Number(it.productId),
          expectedQuantity: Math.round(Number(it.expectedQuantity) * 1000) / 1000,
        })),
      })
      const created = getPayload(response)
      const customer = customers.find((c) => String(c.id) === String(values.customerId))
      localStorage.removeItem(DRAFT_KEY)
      message.success(`Đã tạo thành công phiếu hẹn ASN ${created?.receiptCode ?? created?.id ?? ''}`)
      onCreated?.({
        ...created,
        customerName: created?.customerName ?? customerName(customer),
        declaredTotal: created?.declaredTotal ?? values.items.reduce((s, it) => s + Number(it.expectedQuantity || 0), 0),
      })
      onClose()
    } catch (error) {
      message.error(errorText(error, 'Không thể tạo phiếu hẹn ASN'))
    } finally { setSubmitting(false) }
  }

  // ===== UI =====
  const title = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(0,87,194,.1)', color: '#0057c2', display: 'grid', placeItems: 'center', fontSize: 18, flex: 'none' }}>
        <FileAddOutlined />
      </div>
      <div style={{ lineHeight: 1.35 }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Tạo phiếu hẹn Inbound (ASN) hỗ trợ Đối tác B2B</div>
        <div className="text-muted" style={{ fontWeight: 400 }}>
          Quy trình tạo ASN khẩn cấp hỗ trợ khách hàng không thể tự thao tác trên Portal đối tác
        </div>
      </div>
    </div>
  )

  const footer = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
      <span className="text-muted">
        Mã ASN tạo tự động tiền tố: <b className="mono" style={{ color: '#0057c2' }}>{codePrefix}xxxx</b>
      </span>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button onClick={onClose}>Hủy bỏ</Button>
        <Button onClick={saveDraft} style={{ background: '#e5eeff', borderColor: '#e5eeff' }}>Lưu bản nháp</Button>
        <Button type="primary" icon={<CheckCircleOutlined />} loading={submitting} onClick={submit}>
          Xác nhận &amp; Cấp mã ASN
        </Button>
      </div>
    </div>
  )

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={896}
      centered
      destroyOnHidden
      closeIcon={<CloseOutlined />}
      title={title}
      footer={footer}
      styles={{ ...modalStyles, body: { ...modalStyles.body, maxHeight: '70vh', overflowY: 'auto' } }}
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{ items: [emptyItem()] }}
      >
        {/* ===== Thông tin chung ===== */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <Form.Item name="customerId" label={label('Khách hàng / Đối tác B2B (Tenant)', true)}
            rules={[{ required: true, message: 'Chọn khách hàng' }]}>
            <Select showSearch optionFilterProp="label" loading={loadingOptions}
              options={customerOptions} placeholder="Chọn khách hàng" onChange={onCustomerChange} />
          </Form.Item>

          <Form.Item name="dockCode" label={label('Cửa Dock tiếp nhận đề xuất', true)}
            rules={[{ required: true, message: 'Chọn cửa Dock' }]}>
            <Select options={DOCK_OPTIONS} placeholder="Chọn cửa Dock" />
          </Form.Item>

          <Form.Item name="expectedAt" label={label('Ngày & Giờ hẹn dự kiến tới Dock', true)}
            rules={[{ required: true, message: 'Chọn ngày và giờ hẹn' }]}>
            <DatePicker showTime={{ format: 'HH:mm' }} format="DD/MM/YYYY HH:mm" style={{ width: '100%' }}
              disabledDate={(d) => d.isBefore(dayjs(), 'day')} />
          </Form.Item>

          <div>
            <div style={{ marginBottom: 8 }}>{label('Biển số xe & Tải trọng phương tiện', true)}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Form.Item name="vehiclePlate" rules={[{ required: true, message: 'Nhập biển số xe' }, { max: 20, message: 'Tối đa 20 ký tự' }]}>
                <Input placeholder="VD: 51D-892.44" maxLength={20} />
              </Form.Item>
              <Form.Item name="vehicleType" rules={[{ required: true, message: 'Nhập tải trọng xe' }]}>
                <Input placeholder="VD: Xe tải 3.5 Tấn" />
              </Form.Item>
            </div>
          </div>
        </div>

        {/* ===== Danh mục SKU ===== */}
        <div style={{ borderTop: '1px solid #e5eeff', paddingTop: 12, marginTop: 4 }}>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>
                    <InboxOutlined style={{ color: '#0057c2', marginRight: 6 }} />
                    Danh mục SKU &amp; Số lượng khai báo
                  </span>
                  <Button type="link" size="small" icon={<PlusOutlined />} onClick={() => add(emptyItem())}>
                    Thêm dòng SKU
                  </Button>
                </div>

                <div style={{ border: '1px solid #e5eeff', borderRadius: 6, overflow: 'hidden' }}>
                  {/* Header */}
                  <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 8, alignItems: 'center', background: '#eff4ff', color: '#414755', fontSize: 12, fontWeight: 500, padding: '0 12px', height: 36, borderBottom: '1px solid #e5eeff' }}>
                    <span>Mã SKU</span>
                    <span>Tên sản phẩm</span>
                    <span>Đơn vị</span>
                    <span style={{ textAlign: 'right' }}>SL Khai báo</span>
                    <span>Quy đổi Pallet / Ghi chú</span>
                    <span />
                  </div>

                  {/* Rows */}
                  {fields.map((field, index) => {
                    const productId = watchedItems?.[index]?.productId
                    const product = productMap.get(productId)
                    return (
                      <div key={field.key} style={{ display: 'grid', gridTemplateColumns: GRID, gap: 8, alignItems: 'start', padding: '8px 12px', borderBottom: index < fields.length - 1 ? '1px solid #e5eeff' : 'none' }}>
                        <Form.Item name={[field.name, 'productId']} style={{ marginBottom: 0 }}
                          rules={[
                            { required: true, message: 'Chọn SKU' },
                            {
                              validator: (_, value) => {
                                const dup = (form.getFieldValue('items') ?? []).filter((it) => it?.productId === value).length > 1
                                return value && dup ? Promise.reject(new Error('SKU bị trùng')) : Promise.resolve()
                              },
                            },
                          ]}>
                          <Select size="small" showSearch loading={loadingOptions} disabled={!customerId}
                            placeholder={customerId ? 'Chọn SKU' : 'Chọn khách trước'}
                            options={productOptions}
                            filterOption={(input, opt) => opt.search.toLowerCase().includes(input.toLowerCase())}
                            optionRender={(opt) => (
                              <div style={{ lineHeight: 1.3 }}>
                                <div className="mono" style={{ color: '#0057c2', fontWeight: 600, fontSize: 12 }}>{opt.data.label}</div>
                                <div className="text-muted">{opt.data.name}</div>
                              </div>
                            )}
                            labelRender={(opt) => <span className="mono" style={{ color: '#0057c2', fontWeight: 600, fontSize: 12 }}>{opt.label}</span>}
                            onChange={(v) => onProductChange(index, v)} />
                        </Form.Item>

                        <div style={{ fontSize: 12, lineHeight: '24px', color: product ? '#0b1c30' : '#727786' }}>
                          {product?.name ?? '—'}
                        </div>

                        <Form.Item name={[field.name, 'unit']} style={{ marginBottom: 0 }}>
                          <Select size="small" options={unitOptions(product?.unit)} placeholder="Đơn vị" />
                        </Form.Item>

                        <Form.Item name={[field.name, 'expectedQuantity']} style={{ marginBottom: 0 }}
                          rules={[
                            { required: true, message: 'Nhập SL' },
                            { type: 'number', min: 0.001, message: 'SL > 0' },
                          ]}>
                          <InputNumber size="small" min={0.001} controls={false} style={{ width: '100%' }}
                            className="mono" />
                        </Form.Item>

                        <Form.Item name={[field.name, 'lineNote']} style={{ marginBottom: 0 }}>
                          <Input size="small" variant="borderless" maxLength={200}
                            placeholder="VD: ~ 5 Pallet tiêu chuẩn" style={{ fontSize: 12, paddingLeft: 0 }} />
                        </Form.Item>

                        <Button type="text" size="small" aria-label="Xóa dòng SKU"
                          icon={<DeleteOutlined />} disabled={fields.length === 1}
                          style={{ color: '#727786' }}
                          onClick={() => remove(field.name)} />
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </Form.List>
        </div>

        {/* ===== Ghi chú ===== */}
        <Form.Item name="note" label={label('Ghi chú điều phối & Yêu cầu bốc dỡ đặc biệt')} style={{ marginTop: 16, marginBottom: 0 }}>
          <Input.TextArea rows={2} maxLength={4000} style={{ resize: 'none' }}
            placeholder="Nhập ghi chú yêu cầu xe nâng, phụ xếp dỡ hoặc hướng dẫn phụ trách kho tiếp nhận..." />
        </Form.Item>
      </Form>
    </Modal>
  )
}