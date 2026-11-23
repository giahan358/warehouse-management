import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, Input, InputNumber, Modal, Select, Table, message } from 'antd'
import {
  CarOutlined, CheckSquareOutlined, ClockCircleOutlined, EyeOutlined, FilterOutlined,
  InboxOutlined, SearchOutlined, WarningOutlined, ShoppingOutlined, SendOutlined,
} from '@ant-design/icons'
import outboundApi from '../../api/outboundApi'
import metaApi from '../../api/metaApi'
import PageHeader from '../../components/common/PageHeader'
import SegmentedBar from '../../components/common/SegmentedBar'
import StatusTag from '../../components/common/StatusTag'
import OrderDetailModal from '../../components/common/OrderDetailModal'
import { FULFILLMENT_NEXT, FULFILLMENT_STATUS, SHORTAGE_REASONS } from '../../constants/statuses'

const TABS = [
  { key: 'ALL', label: 'Tất cả đơn chờ' },
  { key: 'EXPRESS', label: 'Đơn giao hỏa tốc' },
  { key: 'STANDARD', label: 'Đơn giao thường' },
]

export default function StaffOutboundPage() {
  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState({ pending: 0, preparing: 0, ready: 0, delivering: 0 })
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('ALL')
  const [keyword, setKeyword] = useState('')
  const [selected, setSelected] = useState([])
  const [shortageOrder, setShortageOrder] = useState(null)
  const [detailOrder, setDetailOrder] = useState(null)
  const emptyShortage = { sku: undefined, reason: undefined, quantityActual: undefined, note: '' }
  const [shortageForm, setShortageForm] = useState(emptyShortage)
  const [trackingOrder, setTrackingOrder] = useState(null)
  const [trackingForm, setTrackingForm] = useState({ carrier: undefined, trackingCode: '' })
  const [carrierOptions, setCarrierOptions] = useState([])
  const [reportOrder, setReportOrder] = useState(null)
  const updateRef = useRef(null)

  const load = async () => {
    try {
      const d = await outboundApi.getFulfillment()
      setRows(d.orders)
      setSummary(d.summary)
    } catch (error) {
      message.error(error?.response?.data?.message ?? error.message ?? 'Không tải được danh sách đơn xuất kho')
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])
  useEffect(() => {
    metaApi.getOptions().then((options) => {
      setCarrierOptions((options?.carriers ?? []).map((carrier) => ({ value: carrier, label: carrier.replaceAll('_', ' ') })))
    }).catch((error) => message.error(error?.response?.data?.message ?? 'Không tải được danh sách đơn vị vận chuyển'))
  }, [])

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return rows.filter(
      (r) =>
        (tab === 'ALL' || r.speed === tab) &&
        (!kw || [r.id, r.customer, r.receiver, r.tracking].some((v) => v?.toLowerCase().includes(kw))),
    )
  }, [rows, tab, keyword])

  const tabCount = (k) => (k === 'ALL' ? rows.length : rows.filter((r) => r.speed === k).length)

  // PATCH /outbound-orders/{id}/status — chỉ đi tới 1 bước kế tiếp
  const advance = async (order, to) => {
    const next = to ?? FULFILLMENT_NEXT[order.status]
    if (!next) return
    try {
      const updated = await outboundApi.updateStatus(order.orderId ?? order.id, next)
      const savedStatus = updated?.status ?? next
      await load()
      message.success(`${order.id}: ${FULFILLMENT_STATUS[order.status]?.label ?? order.status} → ${FULFILLMENT_STATUS[savedStatus]?.label ?? savedStatus}`)
    } catch (error) {
      message.error(error?.response?.data?.error?.message ?? error?.response?.data?.message ?? error.message ?? 'Không cập nhật được trạng thái đơn')
    }
  }

  const closeShortage = () => { setShortageOrder(null); setShortageForm(emptyShortage) }

  const submitShortage = async () => {
    const { sku, reason, quantityActual, note } = shortageForm
    if (!sku || !reason || quantityActual == null) return message.error('Vui lòng chọn SKU, nhập số lượng thực soạn và lý do')
    if (reason === 'OTHER' && !note.trim()) return message.error('Vui lòng ghi chú chi tiết cho lý do "Khác"')
    try {
      const item = shortageOrder.items.find((entry) => entry.sku === sku)
      await outboundApi.updateActualQuantity(shortageOrder.orderId ?? shortageOrder.id, item.itemId, quantityActual, `${reason}: ${note.trim()}`.trim())
      message.success(`Đã lưu số lượng thực soạn cho ${sku}`)
      closeShortage()
      await load()
    } catch (error) {
      message.error(error?.response?.data?.error?.message ?? error?.response?.data?.message ?? error.message ?? 'Không gửi được báo cáo thiếu hàng')
    }
  }

  const saveActualQuantity = async (item, quantityActual, note) => {
    try {
      await outboundApi.updateActualQuantity(detailOrder.orderId ?? detailOrder.id, item.itemId, quantityActual, note)
      setDetailOrder(await outboundApi.getById(detailOrder.orderId ?? detailOrder.id))
      await load()
      message.success(`Đã cập nhật số lượng thực soạn của ${item.sku}`)
    } catch (error) {
      message.error(error?.response?.data?.error?.message ?? error?.response?.data?.message ?? error.message ?? 'Không cập nhật được số lượng thực soạn')
      throw error
    }
  }

  const openTracking = async (order) => {
    try {
      const latest = await outboundApi.getById(order.orderId ?? order.id)
      setTrackingOrder(latest)
      setTrackingForm({ carrier: latest.carrierCode ?? undefined, trackingCode: latest.tracking === '—' ? '' : latest.tracking ?? '' })
    } catch (error) {
      message.error(error?.response?.data?.message ?? 'Không tải được chi tiết đơn xuất')
    }
  }

  const submitTracking = async () => {
    if (!trackingForm.carrier || !trackingForm.trackingCode.trim()) return message.error('Vui lòng chọn đơn vị vận chuyển và nhập mã vận đơn')
    try {
      const id = trackingOrder.orderId ?? trackingOrder.id
      await outboundApi.updateTracking(id, trackingForm.carrier, trackingForm.trackingCode.trim())
      await outboundApi.updateStatus(id, 'IN_DELIVERY')
      setTrackingOrder(null)
      await load()
      message.success(`Đã cập nhật vận đơn và bàn giao ${trackingOrder.id} cho đơn vị vận chuyển`)
    } catch (error) {
      message.error(error?.response?.data?.error?.message ?? error?.response?.data?.message ?? error.message ?? 'Không cập nhật được vận đơn/bàn giao')
    }
  }

  const openHandoverReport = async (order) => {
    try { setReportOrder(await outboundApi.getHandoverReport(order.orderId ?? order.id)) }
    catch (error) { message.error(error?.response?.data?.error?.message ?? error?.response?.data?.message ?? error.message ?? 'Không tải được biên bản bàn giao') }
  }

  const actions = (r) => {
    switch (r.status) {
      case 'PENDING':
        return (
          <span style={{ display: 'inline-flex', gap: 12, alignItems: 'center' }}>
            <a onClick={() => advance(r)}>Bắt đầu lấy</a>
            {r.shortage && <a style={{ color: '#ba1a1a' }} onClick={() => setShortageOrder(r)}><WarningOutlined /> Thiếu hàng</a>}
          </span>
        )
      case 'PICKING':
        return <Button type="primary" size="small" onClick={() => advance(r)}>Xác nhận đóng gói</Button>
      case 'PACKED':
        return <Button size="small" icon={<InboxOutlined />} onClick={() => openTracking(r)}>Bàn giao xe 3PL</Button>
      case 'IN_DELIVERY':
        return <span style={{ display: 'inline-flex', gap: 8 }}>
          <a onClick={() => openHandoverReport(r)}>Xem biên bản bàn giao</a>
          <Button size="small" onClick={() => advance(r, 'DELIVERED')}>Đã giao</Button>
          <Button size="small" danger onClick={() => advance(r, 'RETURNED')}>Hoàn hàng</Button>
        </span>
      default:
        return <a onClick={() => openHandoverReport(r)}>Xem biên bản bàn giao</a>
    }
  }

  const columns = [
    {
      title: 'MÃ ĐƠN XUẤT / THỜI GIAN', width: 190,
      render: (_, r) => <div><span className="mono-link">{r.id}</span><div className="text-muted"><ClockCircleOutlined /> {r.createdAt}</div></div>,
    },
    { title: 'KHÁCH HÀNG ỦY THÁC', dataIndex: 'customer', render: (v) => <b>{v}</b> },
    {
      title: 'NGƯỜI NHẬN & ĐỊA CHỈ', width: 280,
      render: (_, r) => <div>{r.receiver}{r.phone && ` - ${r.phone}`}<div className="text-muted">{r.address}</div></div>,
    },
    { title: 'MẶT HÀNG', dataIndex: 'itemsLabel' },
    {
      title: 'ĐƠN VỊ VẬN CHUYỂN (3PL)', width: 200,
      render: (_, r) => <div><span className={`code-chip${r.carrierTone === 'gray' ? ' gray' : ''}`}><CarOutlined /> {r.carrier}</span><div className="mono text-muted">{r.tracking}</div></div>,
    },
    { title: 'TRẠNG THÁI QUY TRÌNH', dataIndex: 'status', render: (v) => <StatusTag map={FULFILLMENT_STATUS} status={v} /> },
    {
      title: 'THAO TÁC NHÂN VIÊN', align: 'right', width: 250,
      render: (_, r) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
          <EyeOutlined style={{ color: '#0057c2', cursor: 'pointer' }} onClick={async () => {
            try { setDetailOrder(await outboundApi.getById(r.orderId ?? r.id)) }
            catch (error) { message.error(error?.response?.data?.message ?? 'Không tải được chi tiết đơn xuất') }
          }} />
          {actions(r)}
        </span>
      ),
    },
  ]

  const stepCards = [
    { eyebrow: 'BƯỚC 1 • PENDING', title: 'Chờ lấy hàng ca trực', value: summary.pending, unit: 'đơn hàng chờ soạn', color: '#ba1a1a', icon: <ClockCircleOutlined />, bg: '#ffdad6', pct: 40 },
    { eyebrow: 'BƯỚC 2 • PREPARING', title: 'Soạn đồ & Đóng gói', value: summary.preparing, unit: 'đơn tại bàn phân loại', color: '#0057c2', icon: <CheckSquareOutlined />, bg: '#dce9ff', pct: 30 },
    { eyebrow: 'BƯỚC 3 • SẴN SÀNG XUẤT', title: 'Chờ bàn giao xe 3PL', value: summary.ready, unit: 'kiện đã dán tem hoàn chỉnh', color: '#006767', icon: <ShoppingOutlined />, bg: '#dce9ff', pct: 70 },
    { eyebrow: 'BƯỚC 4 • IN_DELIVERY', title: 'Đã nạp xe & Giao hàng', value: summary.delivering, unit: 'đơn giao xe thành công', color: '#0b1c30', icon: <SendOutlined />, bg: '#dce9ff', pct: 100 },
  ]

  const deliveryRows = rows.filter((r) => FULFILLMENT_NEXT[r.status] || r.status === 'IN_DELIVERY')

  return (
    <div className="page">
      <PageHeader
        eyebrow="XUẤT KHO / XỬ LÝ YÊU CẦU XUẤT HÀNG"
        title="Chuẩn bị hàng & Xuất kho (Outbound Fulfillment)"
        tag="HUB-TANBINH // DOCK-03"
        extra={
          <Button type="primary" size="large" icon={<CarOutlined />} onClick={() => updateRef.current?.scrollIntoView({ behavior: 'smooth' })}>
            Cập nhật trạng thái giao hàng
          </Button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 16 }}>
        {stepCards.map((c) => (
          <div key={c.eyebrow} className="step-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="step-eyebrow" style={{ color: c.color }}>{c.eyebrow}</div>
                <div style={{ fontWeight: 600 }}>{c.title}</div>
              </div>
              <div className="stat-icon" style={{ background: c.bg, color: c.color }}>{c.icon}</div>
            </div>
            <div style={{ margin: '8px 0' }}>
              <span className="step-value" style={{ color: c.color }}>{c.value}</span>{' '}
              <span className="text-muted">{c.unit}</span>
            </div>
            <SegmentedBar parts={[{ value: c.pct, color: c.color }]} height={4} />
          </div>
        ))}
      </div>

      <div className="card-flat">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 4, background: '#eff4ff', padding: 4, borderRadius: 8 }}>
            {TABS.map((t) => (
              <Button key={t.key} size="small" type={tab === t.key ? 'primary' : 'text'} onClick={() => setTab(t.key)}>
                {t.label} ({tabCount(t.key)})
              </Button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Input allowClear style={{ width: 260 }} prefix={<SearchOutlined />} placeholder="Tìm theo mã OUT, SKU..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
            <Button icon={<FilterOutlined />}>Lọc nâng cao</Button>
          </div>
        </div>
        <Table
          rowKey="id" loading={loading} columns={columns} dataSource={filtered} scroll={{ x: 1200 }}
          rowSelection={{ selectedRowKeys: selected, onChange: setSelected, getCheckboxProps: (r) => ({ disabled: r.status === 'HANDED_OVER' || r.status === 'IN_DELIVERY' }) }}
          rowClassName={(r) => (r.shortage && r.status === 'PENDING' ? 'row-danger' : '')}
          pagination={{ pageSize: 10, total: Math.max(summary.pending + summary.preparing + summary.ready, filtered.length), showSizeChanger: false, showTotal: (t) => `Hiển thị ${filtered.length} trong tổng số ${t} đơn chờ xuất` }}
        />
      </div>

      <div className="card-flat" ref={updateRef}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <b style={{ fontSize: 15 }}><CarOutlined /> Cập nhật trạng thái xuất hàng & Giao hàng</b>
            <div className="text-muted">Cập nhật tiến độ giao hàng cho các đơn chuẩn bị xuất (theo quy định: chỉ cập nhật trạng thái đơn, không thay đổi tồn kho tùy ý hay tạo thanh toán).</div>
          </div>
          <span className="chip">Tổng: {String(deliveryRows.length).padStart(2, '0')} đơn xuất</span>
        </div>
        <Table
          style={{ marginTop: 12 }} rowKey="id" size="small" pagination={false} dataSource={deliveryRows} scroll={{ x: 900 }}
          columns={[
            { title: 'MÃ ĐƠN XUẤT', dataIndex: 'id', render: (v) => <span className="mono-link">{v}</span> },
            { title: 'KHÁCH HÀNG / NGƯỜI NHẬN', render: (_, r) => <span>{r.customer} / {r.receiver}</span> },
            { title: 'ĐƠN VỊ VẬN CHUYỂN (3PL)', render: (_, r) => <span>{r.carrier} ({r.tracking})</span> },
            {
              title: 'TRẠNG THÁI HIỆN TẠI', width: 220,
              render: (_, r) => {
                const next = FULFILLMENT_NEXT[r.status]
                return (
                  <Select
                    size="small" style={{ width: 190 }} value={r.status} disabled={!next || r.status === 'PACKED'}
                    onChange={(to) => advance(r, to)}
                    options={[
                      { value: r.status, label: FULFILLMENT_STATUS[r.status].label },
                      ...(next ? [{ value: next, label: `→ ${FULFILLMENT_STATUS[next].label}` }] : []),
                    ]}
                  />
                )
              },
            },
            { title: 'MẶT HÀNG', dataIndex: 'itemsLabel', align: 'right' },
          ]}
        />
      </div>

      <OrderDetailModal
        order={detailOrder}
        onClose={() => setDetailOrder(null)}
        onStart={async () => { await advance(detailOrder); setDetailOrder(null) }}
        onShortage={() => { setShortageOrder(detailOrder); setDetailOrder(null) }}
        onSaveActualQuantity={saveActualQuantity}
      />

      <Modal
        open={!!shortageOrder}
        width={520}
        title={<span style={{ color: '#ba1a1a' }}><WarningOutlined /> Ghi nhận thiếu hàng / Tạm dừng đơn</span>}
        okText="Gửi báo cáo" cancelText="Hủy bỏ" okButtonProps={{ danger: true }}
        onOk={submitShortage}
        onCancel={closeShortage}
      >
        <div style={{ background: '#eff4ff', padding: 8, borderRadius: 8, marginBottom: 12 }}>
          <b>Đơn hàng bị ảnh hưởng:</b> <span className="mono-link">{shortageOrder?.id}</span>
          <div className="text-muted">
            Khách hàng: {shortageOrder?.customer}{shortageOrder?.slaLeft && ` • SLA còn lại: ${shortageOrder.slaLeft}`}
          </div>
        </div>

        <div style={{ fontWeight: 600, marginBottom: 4 }}>SKU thiếu hàng thực tế tại kệ:</div>
        <Select
          style={{ width: '100%', marginBottom: 12 }} placeholder="Chọn SKU"
          value={shortageForm.sku} onChange={(sku) => setShortageForm((f) => ({ ...f, sku }))}
          options={(shortageOrder?.items ?? []).map((i) => ({ value: i.sku, label: `${i.sku} (${i.name})` }))}
        />

        <div style={{ fontWeight: 600, marginBottom: 4 }}>Lý do thiếu hàng tại vị trí kệ:</div>
        <Select
          style={{ width: '100%', marginBottom: 12 }} placeholder="Chọn lý do"
          value={shortageForm.reason} onChange={(reason) => setShortageForm((f) => ({ ...f, reason }))}
          options={SHORTAGE_REASONS}
        />

        <div style={{ fontWeight: 600, marginBottom: 4 }}>Số lượng thực soạn:</div>
        <InputNumber min={0} max={shortageOrder?.items?.find((item) => item.sku === shortageForm.sku)?.qty} precision={0}
          style={{ width: '100%', marginBottom: 12 }} value={shortageForm.quantityActual}
          onChange={(quantityActual) => setShortageForm((f) => ({ ...f, quantityActual }))} />

        <div style={{ fontWeight: 600, marginBottom: 4 }}>Ghi chú bổ sung cho bộ phận Điều phối & Kiểm kê:</div>
        <Input.TextArea
          rows={3} value={shortageForm.note}
          onChange={(e) => setShortageForm((f) => ({ ...f, note: e.target.value }))}
          placeholder="Nhập chi tiết vị trí kệ, tình trạng sản phẩm..."
        />

        <Alert
          style={{ marginTop: 12 }} type="warning" showIcon
          message="Số lượng thực soạn và ghi chú sẽ được lưu vào đơn xuất. Nhân viên kho không sửa trực tiếp tồn kho."
        />
      </Modal>

      <Modal open={!!trackingOrder} title={`Cập nhật vận đơn & bàn giao ${trackingOrder?.id ?? ''}`}
        okText="Lưu và bàn giao" cancelText="Hủy" onCancel={() => setTrackingOrder(null)} onOk={submitTracking}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Đơn vị vận chuyển</div>
        <Select style={{ width: '100%', marginBottom: 12 }} placeholder="Chọn đơn vị vận chuyển"
          value={trackingForm.carrier} options={carrierOptions}
          onChange={(carrier) => setTrackingForm((form) => ({ ...form, carrier }))} />
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Mã vận đơn</div>
        <Input value={trackingForm.trackingCode} placeholder="Nhập mã vận đơn"
          onChange={(event) => setTrackingForm((form) => ({ ...form, trackingCode: event.target.value }))} />
      </Modal>

      <OrderDetailModal order={reportOrder} reportMode onClose={() => setReportOrder(null)} />
    </div>
  )
}
