import { useEffect, useMemo, useState, useCallback } from 'react'
import { Button, Input, message, Progress, Select, Table, Tag } from 'antd'
import {
  CarOutlined, CheckCircleOutlined, ClockCircleOutlined, EyeOutlined,
  ReloadOutlined, SearchOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import inboundApi from '../../api/inboundApi'
import PageHeader from '../../components/common/PageHeader'
import StatusTag from '../../components/common/StatusTag'
import ConfirmModal from '../../components/common/ConfirmModal'
import { INBOUND_STATUS } from '../../constants/statuses'
import { formatNumber } from '../../utils/formatCurrency'

const TABS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'WAITING', label: 'Chờ xe đến' },
  { key: 'AT_DOCK', label: 'Đang tại Dock' },
  { key: 'UNLOADING', label: 'Đang dỡ hàng' },
  { key: 'DONE', label: 'Hoàn tất hôm nay' },
]

const DOCK_CLASS = { primary: 'code-chip', cyan: 'code-chip cyan', gray: 'code-chip gray' }

export default function StaffInboundSchedulePage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('ALL')
  const [keyword, setKeyword] = useState('')
  const [dock, setDock] = useState('all')
  const [status, setStatus] = useState('all')
  const [checkin, setCheckin] = useState(null) 

  // fetch async/await, setState nằm sau await → không bị lint
  const load = useCallback(async () => {
    try {
      const d = await inboundApi.getSchedule()
      setRows(d)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const refresh = async () => {
    setLoading(true)
    await load()
  }

  const counts = useMemo(
    () => Object.fromEntries(TABS.map((t) => [t.key, t.key === 'ALL' ? rows.length : rows.filter((r) => r.phase === t.key).length])),
    [rows],
  )

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return rows.filter(
      (r) =>
        (tab === 'ALL' || r.phase === tab) &&
        (dock === 'all' || r.dock === dock) &&
        (status === 'all' || r.status === status) &&
        (!kw || [r.id, r.truck, r.customer].some((v) => v?.toLowerCase().includes(kw))),
    )
  }, [rows, tab, keyword, dock, status])

  const totals = useMemo(() => {
    const qty = filtered.reduce((s, r) => s + r.qty, 0)
    const unloaded = filtered.reduce((s, r) => s + r.unloaded, 0)
    return { qty, unloaded, pct: qty ? ((unloaded / qty) * 100).toFixed(1) : '0.0' }
  }, [filtered])

  const docks = useMemo(() => [...new Set(rows.map((r) => r.dock).filter(Boolean))], [rows])

  // POST /inbound-receipts/{id}/start: SCHEDULED → RECEIVING (khóa quyền hủy của khách)
  const doCheckin = async () => {
    try {
      await inboundApi.startReceipt(checkin.id)
      setRows((rs) => rs.map((r) => (r.id === checkin.id ? { ...r, status: 'RECEIVING', phase: 'AT_DOCK', timeLabel: 'Bắt đầu lúc: vừa xong' } : r)))
      message.success(`Đã chuyển ${checkin.id} sang RECEIVING`)
    } catch {
      message.error('409 INVALID_RECEIPT_STATUS: phiếu không còn ở trạng thái SCHEDULED')
    } finally {
      setCheckin(null)
    }
  }

  const columns = [
    {
      title: 'MÃ PHIẾU ASN & KHÁCH HÀNG', width: 260,
      render: (_, r) => (
        <div>
          <span className="mono-link" style={r.phase === 'DONE' ? { textDecoration: 'line-through', color: '#727786' } : undefined}>{r.id}</span>
          <div className="text-muted"><ClockCircleOutlined /> {r.timeLabel}</div>
          <div style={{ marginTop: 4 }}>
            {r.customer} <span className="chip" style={{ marginLeft: 4 }}>{r.plan}</span>
          </div>
        </div>
      ),
    },
    {
      title: 'DỰ KIẾN KHAI BÁO & XE', width: 230,
      render: (_, r) => (
        <div>
          <div className="mono" style={{ fontWeight: 600 }}><CarOutlined /> {r.truck}</div>
          <div style={{ fontSize: 12 }}>
            <b>{r.qtyLabel}</b> <span className="text-muted">/ {r.skuCount} SKU{r.skuSuffix ? ` ${r.skuSuffix}` : ''}</span>
          </div>
          {r.progress != null && <Progress percent={r.progress} size="small" showInfo={false} strokeColor={r.progress === 100 ? '#006767' : '#0057c2'} style={{ marginBottom: 0 }} />}
        </div>
      ),
    },
    {
      title: 'CỬA DOCK TIẾP NHẬN', width: 170,
      render: (_, r) =>
        r.dock ? (
          <span className={DOCK_CLASS[r.dockTone]}>● {r.dock} <span style={{ fontWeight: 400 }}>({r.dockNote})</span></span>
        ) : <span className="text-muted">-- Chưa gán Dock --</span>,
    },
    {
      title: 'TRẠNG THÁI TIẾP NHẬN', width: 190,
      render: (_, r) =>
        r.phase === 'DONE'
          ? <Tag icon={<CheckCircleOutlined />} color="success" style={{ margin: 0 }}>Đã hoàn tất nhập kho</Tag>
          : <StatusTag map={INBOUND_STATUS} status={r.status} />,
    },
    {
      title: 'THAO TÁC TRỰC BAN KHO', align: 'right', width: 220,
      render: (_, r) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {r.status === 'RECEIVING' && (
            <Button type="primary" size="small" onClick={() => navigate(`/staff/counting/${r.id}`)}>Mở phiếu kiểm đếm</Button>
          )}
          {r.status === 'SCHEDULED' && (
            <Button type="primary" size="small" onClick={() => setCheckin(r)}>Check-in vào Dock</Button>
          )}
          <Button size="small" type="text" icon={<EyeOutlined />} aria-label="Xem chi tiết" onClick={() => message.info(`Chi tiết ${r.id} (sẽ làm ở bước sau)`)} />
        </span>
      ),
    },
  ]

  return (
    <div className="page">
      <PageHeader
        eyebrow="TIẾP NHẬN HÀNG / DANH SÁCH LỊCH NHẬP KHO TỪ KHÁCH HÀNG"
        title="Tiếp nhận & Quản lý Lịch nhập kho"
        tag="CA SÁNG • DOCK A1-A6 HOẠT ĐỘNG"
        extra={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button icon={<ReloadOutlined />} onClick={refresh}>Làm mới</Button>
          </div>
        }
      />
      <div className="card-flat">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 4, background: '#eff4ff', padding: 4, borderRadius: 8 }}>
            {TABS.map((t) => (
              <Button key={t.key} size="small" type={tab === t.key ? 'primary' : 'text'} onClick={() => setTab(t.key)}>
                {t.label} ({counts[t.key] ?? 0})
              </Button>
            ))}
          </div>
          <span className="text-muted">Đang hiển thị <b style={{ color: '#0057c2' }}>{filtered.length}</b> chuyến</span>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
          <Input allowClear style={{ width: 340 }} prefix={<SearchOutlined />} placeholder="Mã phiếu NK-..., Biển số xe tải, Chủ hàng..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          <Select style={{ width: 200 }} value={dock} onChange={setDock} options={[{ value: 'all', label: 'Cửa Dock tiếp nhận' }, ...docks.map((d) => ({ value: d, label: d }))]} />
          <Select style={{ width: 200 }} value={status} onChange={setStatus}
            options={[{ value: 'all', label: 'Trạng thái: Tất cả' }, ...Object.entries(INBOUND_STATUS).map(([value, s]) => ({ value, label: s.label }))]} />
        </div>

        <Table
          rowKey="id" loading={loading} columns={columns} dataSource={filtered} scroll={{ x: 1000 }}
          pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: [10, 20, 50], showQuickJumper: true }}
          footer={() => (
            <div className="text-muted" style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <span>● Tổng cộng: <b>{filtered.length} lượt xe</b></span>
              <span>Tổng kiện dự kiến: <b>{formatNumber(totals.qty)} kiện</b></span>
              <span>Đã bốc dỡ vào sàn đệm tiếp nhận: <b style={{ color: '#006767' }}>{formatNumber(totals.unloaded)} kiện ({totals.pct}%)</b></span>
            </div>
          )}
        />
      </div>

      <ConfirmModal
        open={!!checkin}
        title="Check-in xe vào Dock?"
        content={checkin && (
          <span>
            Chuyển phiếu <b>{checkin.id}</b> ({checkin.customer}) từ <b>SCHEDULED</b> sang <b>RECEIVING</b>.
            Khách hàng sẽ không thể hủy lịch nhập này nữa.
          </span>
        )}
        onOk={doCheckin}
        onCancel={() => setCheckin(null)}
      />
    </div>
  )
}