import { useEffect, useMemo, useState } from 'react'
import { Button, Input, Space, Table, Tooltip, message } from 'antd'
import {
  PlusSquareOutlined, SearchOutlined, ReloadOutlined, HistoryOutlined, AuditOutlined, SwapOutlined,
} from '@ant-design/icons'
import inventoryApi from '../../api/inventoryApi'
import dashboardApi from '../../api/dashboardApi'
import PageHeader from '../../components/common/PageHeader'
import SkuCreateModal from '../../components/forms/SkuCreateModal'
import StockHistoryDrawer from '../../components/forms/StockHistoryDrawer'
import RelocationModal from '../../components/forms/RelocationModal'
import AuditModal from '../../components/forms/AuditModal'
import StatusTag from '../../components/common/StatusTag'
import SegmentedBar from '../../components/common/SegmentedBar'
import { STOCK_STATUS } from '../../constants/statuses'
import { formatNumber } from '../../utils/formatCurrency'

const FILTERS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'SAFE', label: 'Tồn An Toàn' },
  { key: 'LOW', label: 'Tồn Thấp / Cảnh Báo' },
  { key: 'OUT', label: 'Hết Hàng / Stock-out' },
]

export default function InventoryPage() {
  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState(null)
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [selectedKeys, setSelectedKeys] = useState([])
  const [createOpen, setCreateOpen] = useState(false)
  const [auditOpen, setAuditOpen] = useState(false)
  const [history, setHistory] = useState({ open: false, item: null })
  const [relocation, setRelocation] = useState({ open: false, targets: [] })

  const load = async () => {
    setLoading(true)
    try {
      const [items, counts] = await Promise.all([
        inventoryApi.getAll({ page: 0, size: 100 }),
        inventoryApi.getSummary(),
      ])
      setRows(items)
      setSummary(counts)
      try {
        setZones(await dashboardApi.getZoneUsage())
      } catch {
        setZones([])
      }
    } catch (error) {
      message.error(error?.response?.data?.error?.message ?? error?.response?.data?.message ?? error.message ?? 'Không tải được dữ liệu tồn kho')
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const data = useMemo(() => rows.filter((r) =>
    (filter === 'ALL' || r.status === filter) &&
    `${r.sku} ${r.name} ${r.bin}`.toLowerCase().includes(keyword.toLowerCase())), [rows, filter, keyword])
  const filterLabels = FILTERS.map((item) => ({
    ...item,
    label: `${item.label} (${summary ? ({
      ALL: summary.total,
      SAFE: summary.safe,
      LOW: summary.low,
      OUT: summary.outOfStock,
    }[item.key] ?? '—') : '—'})`,
  }))

  const columns = [
    {
      title: 'MÃ SKU & SẢN PHẨM', width: 320,
      render: (_, r) => (
        <div style={{ opacity: r.status === 'OUT' ? 0.5 : 1 }}>
          <span className="mono-link">{r.sku}</span> <span className="chip" style={{ color: '#414755' }}>{r.tag}</span>
          <div style={{ fontWeight: 500, textDecoration: r.status === 'OUT' ? 'line-through' : 'none' }}>{r.name}</div>
        </div>
      ),
    },
    { title: 'KHÁCH HÀNG SỞ HỮU', dataIndex: 'owner', width: 170 },
    { title: 'VỊ TRÍ KHO (BIN/RACK)', dataIndex: 'bin', render: (v) => <span className="chip mono" style={{ fontSize: 12 }}>{v}</span> },
    { title: 'TỒN THỰC TẾ', dataIndex: 'onHand', align: 'right', render: (v) => <b className="mono">{formatNumber(v)}</b> },
    { title: 'TẠM GIỮ ĐƠN', dataIndex: 'allocated', align: 'right', render: (v) => <span className="mono" style={{ color: '#0057c2' }}>{formatNumber(v)}</span> },
    {
      title: 'TỒN KHẢ DỤNG', align: 'right',
      render: (_, r) => <b className="mono" style={{ color: r.status === 'EXPIRING' ? '#ba1a1a' : '#006767' }}>{formatNumber(r.onHand - r.allocated)}</b>,
    },
    { title: 'ĐVT', dataIndex: 'unit' },
    { title: 'TRẠNG THÁI TỒN', dataIndex: 'status', render: (v) => <StatusTag map={STOCK_STATUS} status={v} /> },
    {
      title: 'NGÀY NHẬP GẦN NHẤT',
      render: (_, r) => (
        <div style={{ fontSize: 12, color: r.status === 'EXPIRING' ? '#ba1a1a' : undefined }}>
          {r.received}
          <div className="text-muted" style={r.status === 'EXPIRING' ? { color: '#ba1a1a' } : undefined}>{r.note}</div>
        </div>
      ),
    },
    {
      title: 'THAO TÁC', align: 'center',
      render: (_, r) => (
        <Space size={0}>
          <Tooltip title="Lịch sử giao dịch"><Button type="text" icon={<HistoryOutlined />} onClick={() => setHistory({ open: true, item: r })} /></Tooltip>
          <Tooltip title="Điều chuyển vị trí Rack">
            <Button type="text" icon={<SwapOutlined />} disabled={r.onHand === 0} onClick={() => setRelocation({ open: true, targets: [r] })} />
          </Tooltip>
        </Space>
      ),
    },
  ]

  return (
    <div className="page">
      <PageHeader
        eyebrow="KHO TRUNG TÂM TÂN BÌNH / QUẢN TRỊ TỒN KHO ĐA KHÁCH HÀNG"
        title="Tồn kho toàn diện & Danh mục SKU"
        tag={`${summary?.total ?? '—'} SKU Hoạt động`}
        subtitle="Theo dõi thực tế, phân bổ vị trí Bin/Rack và kiểm soát hàng quá hạn cho các tài khoản đối tác lưu kho."
        extra={(
          <Space>
            <Button size="large" icon={<AuditOutlined />} onClick={() => setAuditOpen(true)}>Tạo Phiếu Kiểm Kê</Button>
            <Button type="primary" size="large" icon={<PlusSquareOutlined />} onClick={() => setCreateOpen(true)}>Khai Báo SKU Mới</Button>
          </Space>
        )}
      />

      

      <div className="card-flat" style={{ marginBottom: 16 }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Input style={{ width: 380 }} prefix={<SearchOutlined />} allowClear value={keyword}
            onChange={(e) => setKeyword(e.target.value)} placeholder="Tìm kiếm theo Mã SKU, Tên sản phẩm, Barcode, Vị trí Bin..." />
          <Button type="text" icon={<ReloadOutlined />} onClick={() => { setKeyword(''); setFilter('ALL') }}>Đặt lại</Button>
        </Space>
        <Space wrap style={{ marginTop: 12 }}>
          <span className="eyebrow">TRẠNG THÁI TỒN:</span>
          {filterLabels.map((f) => (
            <Button key={f.key} size="small" type={filter === f.key ? 'primary' : 'default'} onClick={() => setFilter(f.key)}>{f.label}</Button>
          ))}
        </Space>
      </div>

      {selectedKeys.length > 0 && (
        <div className="card-flat" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#eff4ff' }}>
          <span>Đã chọn <b>{selectedKeys.length}</b> mã SKU lưu kho</span>
          <Space>
            <Button type="primary" icon={<SwapOutlined />}
              onClick={() => setRelocation({ open: true, targets: rows.filter((r) => selectedKeys.includes(r.sku) && r.onHand > 0) })}>
              Chuyển Vị Trí Hàng Loạt
            </Button>
            <Button onClick={() => setSelectedKeys([])}>Hủy chọn</Button>
          </Space>
        </div>
      )}

      <Table rowKey="sku" loading={loading} columns={columns} dataSource={data}
        rowSelection={{ selectedRowKeys: selectedKeys, onChange: setSelectedKeys }} scroll={{ x: 1300 }}
        rowClassName={(r) => (r.status === 'EXPIRING' ? 'row-danger' : r.status === 'OUT' ? 'row-muted' : '')}
        pagination={{ total: summary?.total ?? 0, pageSize: 20, showSizeChanger: true, showQuickJumper: true }} />

      <div className="card-flat" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <b style={{ fontSize: 16 }}>Tỷ Lệ Lấp Đầy Vị Trí Lưu Kho Tân Bình (Capacity Allocation)</b>
            <div className="text-muted">Giám sát thể tích hàng đang sử dụng theo sức chứa cấu hình của từng Zone</div>
          </div>
          <Space size={16} className="text-muted">
            <span><span style={{ color: '#0057c2' }}>■</span> Đang sử dụng</span>
            <span><span style={{ color: '#e5eeff' }}>■</span> Sức chứa còn lại</span>
          </Space>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {zones.map((z) => {
            const percent = z.usedPercent == null ? null : Math.min(100, Math.max(0, Number(z.usedPercent)))
            const used = Number(z.usedM3 ?? 0)
            const capacity = Number(z.capacityM3 ?? 0)
            return <div key={z.zone} style={{ background: '#eff4ff', borderRadius: 8, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                <span>Zone {z.zone}</span><span style={{ color: '#0057c2' }}>{percent == null ? 'Chưa cấu hình sức chứa' : `${percent}% Tải`}</span>
              </div>
              <div style={{ margin: '8px 0' }}>
                <SegmentedBar height={10} parts={[{ value: percent ?? 0, color: '#0057c2' }, { value: percent == null ? 0 : 100 - percent, color: '#e5eeff' }]} />
              </div>
              <div className="mono text-muted" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Đã dùng: {formatNumber(used)} / {formatNumber(capacity)} m³</span>
                <span>{percent == null ? '—' : `Còn ${formatNumber(Math.max(0, capacity - used))} m³`}</span>
              </div>
            </div>
          })}
          {!zones.length && <div className="text-muted">BE chưa trả dữ liệu sử dụng theo zone.</div>}
        </div>
      </div>

      <SkuCreateModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(row) => setRows((rs) => [row, ...rs])} />
      <AuditModal open={auditOpen} onClose={() => setAuditOpen(false)} />
      <StockHistoryDrawer open={history.open} item={history.item} onClose={() => setHistory((h) => ({ ...h, open: false }))} />
      <RelocationModal open={relocation.open} targets={relocation.targets}
        onClose={() => setRelocation((r) => ({ ...r, open: false }))} onDone={() => { setSelectedKeys([]); load() }} />
    </div>
  )
}
