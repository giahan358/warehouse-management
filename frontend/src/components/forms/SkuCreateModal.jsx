import { useEffect, useState } from 'react'
import { Button, Checkbox, Form, Input, InputNumber, Modal, Select, message } from 'antd'
import {
  AppstoreAddOutlined, CheckCircleOutlined, ColumnHeightOutlined, ControlOutlined, LockOutlined,
  ReloadOutlined, ShopOutlined, ThunderboltOutlined,
} from '@ant-design/icons'
import inventoryApi from '../../api/inventoryApi'
import PopupHeader, { modalStyles } from '../common/PopupHeader'
import PopupSection from '../common/PopupSection'
import { skuCategoryOptions, skuTenantOptions, storageZoneOptions, uomOptions } from '../../mocks/popupData'

const required = (msg) => [{ required: true, message: msg }]
const genSku = () => `SKU-NW-${Math.floor(1000 + Math.random() * 9000)}`

// "12 x 8 x 16" (cm) -> m³
const toCbm = (text) => {
  const n = String(text ?? '').split(/[x×*]/i).map((p) => parseFloat(p.replace(',', '.')))
  if (n.length !== 3 || n.some((v) => !(v > 0))) return null
  return (n[0] * n[1] * n[2]) / 1e6
}

// Chọn Zone dạng thẻ (dùng như control của Form.Item)
function ZoneCards({ value, onChange }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8 }}>
      {storageZoneOptions.map((z) => {
        const active = value === z.value
        return (
          <button key={z.value} type="button" onClick={() => onChange?.(z.value)}
            style={{
              textAlign: 'left', cursor: 'pointer', padding: '8px 12px', borderRadius: 8,
              border: `2px solid ${active ? '#0057c2' : '#c1c6d7'}`, background: active ? '#eff4ff' : '#fff',
            }}>
            <div style={{ fontWeight: 600, color: active ? '#0057c2' : '#0b1c30' }}>{z.title}</div>
            <div className="mono text-muted">{z.desc}</div>
          </button>
        )
      })}
    </div>
  )
}

// Modal "Khai báo mặt hàng SKU mới (Product Master Data)" — UC06
export default function SkuCreateModal({ open, onClose, onCreated }) {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { if (open) form.setFieldsValue({ sku: genSku() }) }, [open, form])

  const dimensions = Form.useWatch('dimensions', form)
  const uom = Form.useWatch('uom', form)
  const trackExpiry = Form.useWatch('trackExpiry', form)
  const cbm = toCbm(dimensions)

  const handleSubmit = async () => {
    const v = await form.validateFields()
    setSubmitting(true)
    try {
      const row = await inventoryApi.createSku({
        ...v, cbm, categoryTag: skuCategoryOptions.find((c) => c.value === v.category)?.value,
      })
      message.success(`Đã đăng ký SKU ${row.sku}`)
      onCreated?.(row)
      onClose()
    } catch (e) {
      message.error(e?.response?.data?.message ?? 'Không thể đăng ký SKU, vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onCancel={onClose} width={860} centered afterClose={() => form.resetFields()}
      styles={{ ...modalStyles, body: { ...modalStyles.body, maxHeight: '68vh', overflowY: 'auto', background: '#f8f9ff' } }}
      title={<PopupHeader icon={<AppstoreAddOutlined />} title="Khai Báo Mặt Hàng SKU Mới (Product Master Data)" tag="Admin Master • UC06"
        subtitle="Thiết lập danh mục sản phẩm, quy cách đóng gói, điều kiện bảo quản nhiệt độ và gán quyền sở hữu Tenant B2B." />}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="mono text-muted"><LockOutlined /> Áp dụng quy tắc UC07: Dữ liệu Master SKU gán cứng phân vùng Tenant Isolation.</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={onClose}>Hủy Bỏ</Button>
            <Button type="primary" icon={<CheckCircleOutlined />} loading={submitting} onClick={handleSubmit}>Lưu & Đăng Ký SKU</Button>
          </div>
        </div>
      }>
      <Form form={form} layout="vertical"
        initialValues={{ uom: 'Chai', zone: 'A', trackExpiry: true, warnDays: 60, fragile: false }}>
        <PopupSection icon={<ShopOutlined />} title="1. THÔNG TIN CƠ BẢN & CHỦ HÀNG (TENANT OWNER)">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 16 }}>
            <Form.Item name="tenantId" label="Chủ Hàng / Doanh Nghiệp B2B" rules={required('Chọn chủ hàng')}>
              <Select placeholder="Chọn doanh nghiệp B2B" options={skuTenantOptions} />
            </Form.Item>
            <Form.Item name="category" label="Ngành Hàng / Phân Loại (Category)" rules={required('Chọn ngành hàng')}>
              <Select placeholder="Chọn ngành hàng" options={skuCategoryOptions} />
            </Form.Item>
            <Form.Item label="Mã SKU Độc Bản (System / Custom)" required style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <Form.Item name="sku" noStyle rules={[...required('Nhập mã SKU'), { pattern: /^SKU-[A-Z0-9-]{3,}$/, message: 'Dạng SKU-XX-0000' }]}>
                  <Input className="mono" style={{ fontWeight: 600, color: '#0057c2' }} />
                </Form.Item>
                <Button icon={<ReloadOutlined />} onClick={() => form.setFieldsValue({ sku: genSku() })}>Tự sinh</Button>
              </div>
            </Form.Item>
            <Form.Item name="barcode" label="Mã Vạch Barcode / GTIN (EAN-13)" rules={[...required('Nhập barcode'), { pattern: /^\d{13}$/, message: 'EAN-13 gồm 13 chữ số' }]}>
              <Input className="mono" placeholder="8935029104825" maxLength={13} />
            </Form.Item>
          </div>
          <Form.Item name="name" label="Tên Sản Phẩm / Danh Pháp Hàng Hóa" rules={required('Nhập tên sản phẩm')} style={{ marginBottom: 0 }}>
            <Input placeholder="VD: Serum Phục Hồi Bio-Ceramide Chuyên Sâu 100ml" />
          </Form.Item>
        </PopupSection>

        <PopupSection icon={<ColumnHeightOutlined />} title="2. QUY CÁCH LƯU KHO & KÍCH THƯỚC (STORAGE SPECS)">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', columnGap: 16 }}>
            <Form.Item name="uom" label="Đơn vị tính cơ bản (UoM)" rules={required('Chọn ĐVT')}>
              <Select options={uomOptions} />
            </Form.Item>
            <Form.Item name="dimensions" label="Kích thước D x R x C (cm)"
              rules={[...required('Nhập kích thước'), { validator: (_, v) => (!v || toCbm(v) ? Promise.resolve() : Promise.reject(new Error('Dạng 12 x 8 x 16'))) }]}>
              <Input className="mono" placeholder="12 x 8 x 16" />
            </Form.Item>
            <Form.Item label="Thể tích kiện (m³ / CBM)">
              <Input readOnly className="mono" value={cbm ? `${cbm.toFixed(4)} m³` : '—'} style={{ background: '#e5eeff', color: '#006767', fontWeight: 700 }} />
            </Form.Item>
            <Form.Item name="weight" label="Trọng lượng tịnh (kg/kiện)" rules={[{ type: 'number', min: 0, message: '≥ 0' }]}>
              <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 16 }}>
            <Form.Item name="palletFactor" label="Tiêu Chuẩn Xếp Pallet (Ti/Hi Pallet Factor)" style={{ marginBottom: 0 }}>
              <Input className="mono" placeholder="48 kiện / Pallet tiêu chuẩn 1.2m" />
            </Form.Item>
            <Form.Item name="masterCarton" label="Hình Thức Đóng Gói Ngoài (Master Carton)" style={{ marginBottom: 0 }}>
              <Input placeholder="Thùng carton 5 lớp dán keo niêm phong QR" />
            </Form.Item>
          </div>
        </PopupSection>

        <PopupSection icon={<ThunderboltOutlined />} title="3. ĐIỀU KIỆN BẢO QUẢN & PHÂN VÙNG LƯU TRỮ (ZONE ALLOCATION)">
          <Form.Item name="zone" label="Phân vùng kho tương thích (Target Storage Zone)" rules={required('Chọn phân vùng')}>
            <ZoneCards />
          </Form.Item>
          <div style={{ background: '#eff4ff', borderRadius: 8, padding: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Kiểm soát hạn sử dụng (FEFO/FIFO Batch)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
              <Form.Item name="trackExpiry" valuePropName="checked" noStyle>
                <Checkbox>Bắt buộc nhập Ngày sản xuất / Hạn sử dụng khi Inbound</Checkbox>
              </Form.Item>
              <span>
                Cảnh báo Cận Date trước{' '}
                <Form.Item name="warnDays" noStyle>
                  <InputNumber min={1} max={365} precision={0} disabled={!trackExpiry} style={{ width: 80 }} />
                </Form.Item>{' '}ngày
              </span>
              <Form.Item name="fragile" valuePropName="checked" noStyle>
                <Checkbox>Hàng giá trị cao / Dễ vỡ</Checkbox>
              </Form.Item>
            </div>
          </div>
        </PopupSection>

        <PopupSection icon={<ControlOutlined />} title="4. ĐỊNH MỨC TỒN AN TOÀN (INVENTORY THRESHOLDS)" style={{ marginBottom: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 16 }}>
            <Form.Item name="minStock" label="Mức Tồn Tối Thiểu (Min / Safety Stock)" rules={required('Nhập mức tối thiểu')} extra={`${uom ?? 'ĐVT'} (Báo động thiếu)`} style={{ marginBottom: 0 }}>
              <InputNumber min={0} precision={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="maxStock" label="Mức Tồn Tối Đa (Max Capacity / Quá tải)" dependencies={['minStock']}
              rules={[
                ...required('Nhập mức tối đa'),
                ({ getFieldValue }) => ({
                  validator: (_, v) => (v == null || v > (getFieldValue('minStock') ?? 0) ? Promise.resolve() : Promise.reject(new Error('Phải lớn hơn mức tối thiểu'))),
                }),
              ]}
              extra={`${uom ?? 'ĐVT'} (Hạn mức lưu kho)`} style={{ marginBottom: 0 }}>
              <InputNumber min={0} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </div>
        </PopupSection>
      </Form>
    </Modal>
  )
}
