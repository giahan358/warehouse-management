import { useEffect, useState } from 'react'
import { Button, Drawer, Spin, Tabs, Tag } from 'antd'
import {
  CheckCircleFilled, ClockCircleFilled, DownloadOutlined, EditOutlined,
  FileDoneOutlined, FileTextOutlined, IdcardOutlined, AccountBookOutlined, UserOutlined, AppstoreOutlined, ShopOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import customerApi from '../../api/customerApi'
import PopupHeader, { drawerStyles } from '../common/PopupHeader'
import PopupSection from '../common/PopupSection'
import SegmentedBar from '../common/SegmentedBar'
import { formatCurrency, formatNumber } from '../../utils/formatCurrency'
import { formatDate } from '../../utils/formatDate'

const Row = ({ k, v }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '4px 0' }}>
    <span className="text-muted">{k}</span><span style={{ textAlign: 'right', fontWeight: 500 }}>{v}</span>
  </div>
)

const Legend = ({ color, children }) => <span className="legend"><i style={{ background: color }} />{children}</span>

function ContractTab({ d }) {
  const { capacity: cap, contract: c } = d
  const pct = ((cap.stored + cap.reserved) / cap.total) * 100
  const remain = dayjs(c.expiresAt).diff(dayjs(), 'day')
  return (
    <>
      <PopupSection title="Tình Trạng Dung Lượng Lưu Trữ" extra={<b className="mono">{formatNumber(cap.stored + cap.reserved)} / {formatNumber(cap.total)} m³ ({pct.toFixed(1)}%)</b>}>
        <SegmentedBar height={10} parts={[
          { value: (cap.stored / cap.total) * 100, color: '#0057c2' },
          { value: (cap.reserved / cap.total) * 100, color: '#afc6ff' },
        ]} />
        <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
          <Legend color="#0057c2">Thực chứa: {formatNumber(cap.stored)} m³</Legend>
          <Legend color="#afc6ff">Dự nhập: {formatNumber(cap.reserved)} m³</Legend>
          <Legend color="#dce9ff">Khả dụng: {formatNumber(cap.free)} m³</Legend>
        </div>
      </PopupSection>

      <PopupSection title="Chi Tiết Hợp Đồng Pháp Lý" icon={<FileTextOutlined />}>
        <Row k="Mã số Hợp đồng:" v={<span className="mono-link">{c.code}</span>} />
        <Row k="Loại hợp đồng:" v={c.type} />
        <Row k="Ngày ký kết:" v={formatDate(c.signedAt)} />
        <Row k="Ngày hết hạn hiệu lực:" v={
          <span style={{ color: remain < 0 ? '#ba1a1a' : undefined }}>
            {formatDate(c.expiresAt)} ({remain < 0 ? 'Đã hết hạn' : `Còn ${remain} ngày`})
          </span>} />
        <Row k="Đơn giá thuê cơ bản:" v={`${formatCurrency(c.unitPrice)} / m³ / tháng`} />
        <Row k="Kỳ hạn sao kê phí:" v={c.cycle} />
      </PopupSection>

      <PopupSection title="Nhân Sự Ủy Quyền Nhận/Xuất Hàng" extra={<span className="chip">{d.authorized.length} nhân sự</span>} style={{ marginBottom: 0 }}>
        {d.authorized.map((p) => (
          <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#eff4ff', borderRadius: 8, padding: '8px 12px', marginBottom: 8 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 20, color: '#0057c2' }}>{p.primary ? <IdcardOutlined /> : <UserOutlined />}</span>
              <div style={{ lineHeight: 1.3 }}>
                <b>{p.name}</b>
                <div className="text-muted">{p.title} • SĐT: {p.phone}</div>
              </div>
            </div>
            <Tag style={{ margin: 0 }}>{p.right}</Tag>
          </div>
        ))}
      </PopupSection>
    </>
  )
}

function HistoryTab({ d }) {
  return (
    <PopupSection title="Lịch Sử Hóa Đơn Dịch Vụ Kho" style={{ marginBottom: 0 }}
      extra={<Button size="small" type="link" icon={<DownloadOutlined />}>Tải sao kê năm 2024</Button>}>
      {d.invoices.map((i) => (
        <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #e5eeff' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {i.paidAt ? <CheckCircleFilled style={{ color: '#389e0d', fontSize: 18 }} /> : <ClockCircleFilled style={{ color: '#d48806', fontSize: 18 }} />}
            <div style={{ lineHeight: 1.3 }}>
              <b className="mono-link">{i.id}</b> <span>({i.label})</span>
              <div className="text-muted">{i.paidAt ? `${i.method} • ${formatDate(i.paidAt)}` : 'Chưa thanh toán'}</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <b className="mono">{formatCurrency(i.amount)}</b>
            <div className="text-muted" style={{ color: i.paidAt ? '#389e0d' : '#d48806' }}>{i.paidAt ? 'Đã quyết toán' : 'Chờ quyết toán'}</div>
          </div>
        </div>
      ))}
    </PopupSection>
  )
}

function LocationTab({ d }) {
  return (
    <PopupSection title="Phân Bổ Kệ Kho & Dãy Chứa Hàng" style={{ marginBottom: 0 }}
      extra={<span className="text-muted">{d.shelves.length * 7} Dãy Kệ Active</span>}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {d.shelves.map((s) => (
          <div key={s.range} style={{ background: '#eff4ff', borderRadius: 8, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="mono-link">{s.zone} • {s.range}</span>
              <span className="chip" style={{ background: '#dce9ff' }}>{s.floors}</span>
            </div>
            <div className="text-muted" style={{ margin: '6px 0' }}>{s.desc}</div>
            <b className="mono">Chiếm {formatNumber(s.m3)} m³ ({formatNumber(s.pallets)} Pallets)</b>
          </div>
        ))}
      </div>
    </PopupSection>
  )
}

// Drawer chi tiết khách hàng B2B — 3 tab: Hợp đồng / Lịch sử phí / Vị trí lưu kho
export default function CustomerDetailDrawer({ open, customer, onClose, onCreateInvoice, onRenew }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('contract')

  useEffect(() => {
    if (!open || !customer) return
    setTab('contract')
    setLoading(true)
    setDetail(null)
    customerApi.getDetail(customer.id).then(setDetail).finally(() => setLoading(false))
  }, [open, customer])

  const items = detail && [
    { key: 'contract', label: <span><FileDoneOutlined /> Hợp Đồng & Dung Lượng</span>, children: <ContractTab d={detail} /> },
    { key: 'history', label: <span><AccountBookOutlined /> Lịch Sử Phí & Giao Dịch</span>, children: <HistoryTab d={detail} /> },
    { key: 'location', label: <span><AppstoreOutlined /> Vị Trí Lưu Kho (Zone/Bay)</span>, children: <LocationTab d={detail} /> },
  ]

  return (
    <Drawer open={open} onClose={onClose} width={640} styles={drawerStyles}
      title={customer && (
        <PopupHeader icon={<ShopOutlined />} title={<span className="mono-link" style={{ fontSize: 15 }}>{customer.id}</span>}
          tag={`${customer.plan} PACK`} subtitle={customer.name} />
      )}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={onClose}>Đóng bảng xem</Button>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button type="primary" style={{ background: '#006767' }} icon={<AccountBookOutlined />} onClick={() => onCreateInvoice?.(customer)}>Lập Hóa Đơn Cước</Button>
            <Button type="primary" icon={<EditOutlined />} onClick={() => onRenew?.(customer)}>Gia Hạn Hợp Đồng</Button>
          </div>
        </div>
      }>
      <Spin spinning={loading}>
        {items && <Tabs activeKey={tab} onChange={setTab} items={items} />}
        {!loading && !detail && <div className="text-muted">Không tải được dữ liệu khách hàng.</div>}
      </Spin>
    </Drawer>
  )
}
