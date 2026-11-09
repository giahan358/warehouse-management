import { useEffect, useMemo, useState } from 'react'
import { Button, Dropdown, Input, Select, Table } from 'antd'
import {
  CarOutlined, CheckSquareOutlined, InboxOutlined, FormOutlined, FilterOutlined,
  ReloadOutlined, SearchOutlined, ClockCircleOutlined, MoreOutlined, ProfileOutlined,
  ShoppingOutlined, SendOutlined, FileSearchOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dashboardApi from '../../api/dashboardApi'
import inventoryApi from '../../api/inventoryApi'
import PageHeader from '../../components/common/PageHeader'
import StatCard from '../../components/common/StatCard'
import StatusTag from '../../components/common/StatusTag'
import AsnDetailModal from '../../components/common/AsnDetailModal'
import { STAFF_STOCK_STATUS, TASK_STATUS } from '../../constants/statuses'
import { getAvailable, getStockStatus } from '../../utils/stockStatus'
import { formatNumber } from '../../utils/formatCurrency'

const TYPE_ICON = {
  RECEIVE: <CarOutlined />,
  COUNT: <ProfileOutlined />,
  PICK: <ShoppingOutlined />,
  HANDOVER: <SendOutlined />,
}

const ZONES = [
  { value: 'all', label: 'Toàn bộ kho Tân Bình' },
  { value: 'A', label: 'Zone A (Hàng khô)' },
  { value: 'B', label: 'Zone B (Điện tử)' },
  { value: 'C', label: 'Zone C (Mát / Dược)' },
]

export default function StaffDashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [stock, setStock] = useState([])
  const [loading, setLoading] = useState(true)
  const [urgentOnly, setUrgentOnly] = useState(false)
  const [draft, setDraft] = useState({ owner: 'all', keyword: '', zone: 'all' })
  const [applied, setApplied] = useState(draft)
  const [asnTask, setAsnTask] = useState(null)
  // Task nhận hàng → mở popup ASN; các task khác → chuyển trang như cũ
  const openTask = (r) => (r.type === 'RECEIVE' ? setAsnTask(r) : navigate(r.to))

  // setState chỉ nằm trong callback của API (loading mặc định đã là true ở lần tải đầu)
  const fetchData = () =>
    Promise.all([dashboardApi.getStaffDashboard(), inventoryApi.getStaffInventory()]).then(([d, s]) => {
      setData(d)
      setStock(s)
      setLoading(false)
    })

  const reload = () => {
    setLoading(true)
    fetchData()
  }

  useEffect(() => { fetchData() }, [])

  const tasks = useMemo(
    () => (data?.tasks ?? []).filter((t) => !urgentOnly || t.urgent),
    [data, urgentOnly],
  )

  const owners = useMemo(
    () => [...new Map(stock.map((s) => [s.ownerId, s.owner])).entries()].map(([value, label]) => ({ value, label })),
    [stock],
  )

  const stockRows = useMemo(() => {
    const kw = applied.keyword.trim().toLowerCase()
    return stock.filter(
      (r) =>
        (applied.owner === 'all' || r.ownerId === applied.owner) &&
        (applied.zone === 'all' || r.zone === applied.zone) &&
        (!kw || r.sku.toLowerCase().includes(kw) || r.name.toLowerCase().includes(kw)),
    )
  }, [stock, applied])

  const kpi = data?.kpi

  const taskColumns = [
    {
      title: 'MÃ NHIỆM VỤ', dataIndex: 'id',
      render: (v, r) => (
        <span className="mono-link">
          <span style={{ color: r.urgent ? '#ba1a1a' : '#0057c2' }}>● </span>{v}
        </span>
      ),
    },
    { title: 'LOẠI NGHIỆP VỤ', dataIndex: 'typeLabel', render: (v, r) => <span><span style={{ color: '#0057c2', marginRight: 8 }}>{TYPE_ICON[r.type]}</span>{v}</span> },
    { title: 'KHÁCH HÀNG CHỦ SỞ HỮU', dataIndex: 'customer', ellipsis: true },
    { title: 'CỬA DOCK / VỊ TRÍ KỆ', dataIndex: 'location', render: (v) => <span className="code-chip">{v}</span> },
    {
      title: 'HẠN HOÀN THÀNH (SLA)', dataIndex: 'sla',
      render: (v, r) => (
        <span className="mono" style={{ fontSize: 12, color: r.urgent ? '#ba1a1a' : undefined }}>
          <ClockCircleOutlined /> {v}
        </span>
      ),
    },
    { title: 'TRẠNG THÁI', dataIndex: 'status', render: (v) => <StatusTag map={TASK_STATUS} status={v} /> },
    {
      title: 'THAO TÁC TRỰC TIẾP', align: 'right',
      render: (_, r) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Button size="small" type={r.primary ? 'primary' : 'default'} onClick={() => openTask(r)}>
            {r.actionLabel}
          </Button>
          <Dropdown
            trigger={['click']}
            menu={{ items: [{ key: 'view', icon: <FileSearchOutlined />, label: 'Xem chi tiết nhiệm vụ' }], onClick: () => openTask(r) }}
          >
            <Button size="small" type="text" icon={<MoreOutlined />} />
          </Dropdown>
        </span>
      ),
    },
  ]

  const stockColumns = [
    { title: 'MÃ SKU', dataIndex: 'sku', render: (v) => <span className="mono-link">{v}</span> },
    { title: 'TÊN SẢN PHẨM', dataIndex: 'name' },
    { title: 'VỊ TRÍ Ô KỆ', dataIndex: 'bin', render: (v) => <span className="mono" style={{ fontSize: 12 }}>{v}</span> },
    { title: 'TỒN THỰC TẾ (ON-HAND)', dataIndex: 'onHand', align: 'right', render: (v, r) => <b>{formatNumber(v)} {r.unit.toLowerCase()}</b> },
    { title: 'ĐANG GIỮ CHỖ (ALLOCATED)', dataIndex: 'allocated', align: 'right', render: (v, r) => <span className="text-muted">{formatNumber(v)} {r.unit.toLowerCase()}</span> },
    {
      title: 'KHẢ DỤNG (AVAILABLE)', align: 'right',
      render: (_, r) => {
        const s = getStockStatus(r)
        return <b style={{ color: s === 'SAFE' ? '#006767' : '#ba1a1a' }}>{formatNumber(getAvailable(r))} {r.unit.toLowerCase()}</b>
      },
    },
    { title: 'TRẠNG THÁI', align: 'center', render: (_, r) => <StatusTag map={STAFF_STOCK_STATUS} status={getStockStatus(r)} /> },
  ]

  return (
    <div className="page">
      <PageHeader
        eyebrow="BÀN LÀM VIỆC / TỔNG QUAN CA TRỰC"
        title="Bàn làm việc & Nhiệm vụ ca trực"
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 16 }}>
        <StatCard label="Lịch nhập kho chờ tiếp nhận" value={kpi ? String(kpi.pendingAsn).padStart(2, '0') : '--'} unit="lịch hẹn" icon={<CarOutlined />} />
        <StatCard label="Phiếu kiểm đếm đang mở" value={kpi ? String(kpi.openCounts).padStart(2, '0') : '--'} unit="phiếu kích hoạt" valueColor="#0057c2" icon={<CheckSquareOutlined />} />
        <StatCard label="Đơn xuất cần chuẩn bị (Pick/Pack)" value={kpi ? kpi.pickPack : '--'} unit="vận đơn" icon={<InboxOutlined />} />
        <StatCard label="Lệch số lượng & Hư hỏng cần biên bản" value={kpi ? String(kpi.discrepancy).padStart(2, '0') : '--'} unit="biên bản" valueColor="#ba1a1a" tone="danger" icon={<FormOutlined />} />
      </div>

      <div className="card-flat">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <b style={{ fontSize: 15 }}>Hàng đợi Tác vụ Ưu tiên cao (Priority Action Queue)</b>
            <span className="chip" style={{ background: '#0057c2', color: '#fff' }}>{tasks.length} VIỆC GẤP</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button icon={<FilterOutlined />} onClick={() => setUrgentOnly((v) => !v)}>
              Lọc: {urgentOnly ? 'Việc gấp' : 'Tất cả'}
            </Button>
            <Button icon={<ReloadOutlined />} onClick={reload}>Làm mới</Button>
          </div>
        </div>
        <Table
          rowKey="id" loading={loading} columns={taskColumns} dataSource={tasks} scroll={{ x: 1000 }}
          pagination={{ pageSize: 4, total: urgentOnly ? tasks.length : data?.totalTasks ?? 0, showSizeChanger: false, showTotal: (t) => `Hiển thị ${tasks.length} trong tổng số ${t} nhiệm vụ ca trực` }}
        />
      </div>

      <div className="card-flat">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <b style={{ fontSize: 15 }}><SearchOutlined /> Tra cứu tồn kho thực tế theo Khách hàng & SKU</b>
          <span className="chip">Dữ liệu thời gian thực</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, alignItems: 'end', marginBottom: 16 }}>
          <div>
            <div className="text-muted" style={{ marginBottom: 4 }}>Chủ sở hữu hàng hóa</div>
            <Select style={{ width: '100%' }} value={draft.owner} onChange={(owner) => setDraft((d) => ({ ...d, owner }))}
              options={[{ value: 'all', label: 'Tất cả khách hàng lưu kho' }, ...owners]} />
          </div>
          <div>
            <div className="text-muted" style={{ marginBottom: 4 }}>Tìm kiếm SKU / Tên sản phẩm</div>
            <Input prefix={<SearchOutlined />} placeholder="SKU-AP-9901" value={draft.keyword}
              onChange={(e) => setDraft((d) => ({ ...d, keyword: e.target.value }))}
              onPressEnter={() => setApplied(draft)} />
          </div>
          <div>
            <div className="text-muted" style={{ marginBottom: 4 }}>Khu vực / Dãy ô kệ</div>
            <Select style={{ width: '100%' }} value={draft.zone} onChange={(zone) => setDraft((d) => ({ ...d, zone }))} options={ZONES} />
          </div>
          <Button type="primary" icon={<SearchOutlined />} onClick={() => setApplied(draft)}>Tra cứu nhanh</Button>
        </div>
        <Table rowKey="sku" size="small" loading={loading} columns={stockColumns} dataSource={stockRows} pagination={false} scroll={{ x: 900 }}
          locale={{ emptyText: 'Không tìm thấy SKU phù hợp' }} />
      </div>

      <AsnDetailModal
        open={!!asnTask}
        receiptId={asnTask?.receiptId}
        onClose={() => setAsnTask(null)}
        onCount={() => { navigate(asnTask.to); setAsnTask(null) }}
      />
    </div>
  )
}