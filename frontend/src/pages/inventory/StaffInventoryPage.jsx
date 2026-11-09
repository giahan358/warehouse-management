import { useEffect, useMemo, useState } from 'react'
import { Button, Input, Select, Table } from 'antd'
import { FilterOutlined, InboxOutlined, ReloadOutlined, SafetyCertificateOutlined, SearchOutlined, UndoOutlined } from '@ant-design/icons'
import inventoryApi from '../../api/inventoryApi'
import PageHeader from '../../components/common/PageHeader'
import StatusTag from '../../components/common/StatusTag'
import InfoBanner from '../../components/common/InfoBanner'
import { STAFF_STOCK_STATUS } from '../../constants/statuses'
import { getAvailable, getStockStatus } from '../../utils/stockStatus'
import { formatNumber } from '../../utils/formatCurrency'
import { formatDateTime } from '../../utils/formatDate'

// Nhân viên kho chỉ XEM tồn kho; tồn kho chỉ đổi qua xác nhận nhập kho (UC09) / xuất kho (UC11)
export default function StaffInventoryPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [owner, setOwner] = useState('all')
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState('all')

  const load = () => {
    setLoading(true)
    inventoryApi.getStaffInventory().then((d) => {
      setRows(d)
      setUpdatedAt(new Date())
      setLoading(false)
    })
  }
  useEffect(() => { load() }, [])

  const owners = useMemo(
    () => [...new Map(rows.map((r) => [r.ownerId, r.owner])).entries()].map(([value, label]) => ({ value, label })),
    [rows],
  )

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return rows.filter(
      (r) =>
        (owner === 'all' || r.ownerId === owner) &&
        (status === 'all' || getStockStatus(r) === status) &&
        (!kw || r.sku.toLowerCase().includes(kw) || r.name.toLowerCase().includes(kw)),
    )
  }, [rows, owner, keyword, status])

  const resetFilters = () => { setOwner('all'); setKeyword(''); setStatus('all') }

  const columns = [
    {
      title: 'MÃ SKU & SẢN PHẨM', width: 340,
      render: (_, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="thumb" style={{ background: '#e5eeff', color: '#0057c2' }}><InboxOutlined /></div>
          <div>
            <span className="mono-link" style={r.onHand === 0 ? { color: '#727786' } : undefined}>{r.sku}</span>
            <div style={{ fontSize: 13 }}>{r.name}</div>
          </div>
        </div>
      ),
    },
    { title: 'CHỦ SỞ HỮU (B2B)', dataIndex: 'owner' },
    { title: 'VỊ TRÍ BIN/RACK', dataIndex: 'bin', render: (v) => <span className="mono" style={{ fontSize: 12 }}>{v}</span> },
    { title: 'ĐVT', dataIndex: 'unit', align: 'center', render: (v) => <span className="chip">{v}</span> },
    { title: 'TỒN THỰC TẾ (ON-HAND)', dataIndex: 'onHand', align: 'right', render: (v) => <b style={{ color: v === 0 ? '#ba1a1a' : undefined }}>{formatNumber(v)}</b> },
    { title: 'TẠM GIỮ (ALLOCATED)', dataIndex: 'allocated', align: 'right', render: (v) => <span className="text-muted">{formatNumber(v)}</span> },
    {
      title: 'TỒN KHẢ DỤNG (AVAILABLE)', align: 'right',
      render: (_, r) => <b style={{ color: getStockStatus(r) === 'OUT' ? '#ba1a1a' : '#0057c2' }}>{formatNumber(getAvailable(r))}</b>,
    },
    { title: 'THỂ TÍCH (M³)', dataIndex: 'volume', align: 'right', render: (v) => v.toFixed(1) },
    { title: 'TÌNH TRẠNG', align: 'center', render: (_, r) => <StatusTag map={STAFF_STOCK_STATUS} status={getStockStatus(r)} /> },
  ]

  return (
    <div className="page">
      <PageHeader
        eyebrow="KHO VẬN & LƯU TRỮ / PHÂN HỆ NHÂN VIÊN KHO / TRA CỨU TỒN KHO"
        title="Tra cứu Tồn kho Toàn diện theo Khách hàng & Sản phẩm"
        tag="WMS-INV-QUERY"
        extra={<Button icon={<ReloadOutlined />} onClick={load}>Làm mới dữ liệu tồn kho</Button>}
      />

      <InfoBanner accent icon={<SafetyCertificateOutlined />} title="Nguyên tắc Bất biến Kho hàng (WMS Data Integrity Ruleset)" badge="QUY CHẾ KIỂM SOÁT CẤP 1">
        Tồn kho chỉ được cập nhật tự động khi Xác nhận nhập kho (UC09) hoặc Chuẩn bị xuất kho (UC11). Nhân viên kho không có quyền sửa trực tiếp
        tồn kho nhằm đảm bảo tính toàn vẹn kiểm toán tài chính, bảo mật số liệu và trách nhiệm pháp lý với khách hàng thuê kho B2B.
      </InfoBanner>

      <div className="card-flat">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <b style={{ fontSize: 15 }}><FilterOutlined /> Bộ lọc & Tra cứu dữ liệu tồn kho</b>
          <Button icon={<UndoOutlined />} onClick={resetFilters}>Đặt lại bộ lọc</Button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr 1fr', gap: 12 }}>
          <div>
            <div className="text-muted" style={{ marginBottom: 4 }}>Chủ sở hữu hàng hóa (Khách hàng B2B):</div>
            <Select style={{ width: '100%' }} value={owner} onChange={setOwner} options={[{ value: 'all', label: '-- Tất cả khách hàng lưu kho --' }, ...owners]} />
          </div>
          <div>
            <div className="text-muted" style={{ marginBottom: 4 }}>Mã SKU hoặc Tên sản phẩm:</div>
            <Input allowClear prefix={<SearchOutlined />} placeholder="Nhập mã SKU (SKU-AP-...), Barcode hoặc tên sản phẩm..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          </div>
          <div>
            <div className="text-muted" style={{ marginBottom: 4 }}>Tình trạng tồn khả dụng:</div>
            <Select style={{ width: '100%' }} value={status} onChange={setStatus}
              options={[{ value: 'all', label: 'Tất cả trạng thái' }, ...Object.entries(STAFF_STOCK_STATUS).map(([value, s]) => ({ value, label: s.label }))]} />
          </div>
        </div>
      </div>

      <div className="card-flat">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          <div>
            <b style={{ fontSize: 15 }}>Bảng dữ liệu Thẻ kho & Tồn khả dụng</b>{' '}
            <span className="chip">Hiển thị: {filtered.length} / {rows.length} sản phẩm</span>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <span className="legend"><i style={{ background: '#006767' }} /> Đủ an toàn (&gt;100)</span>
            <span className="legend"><i style={{ background: '#91caff' }} /> Sắp hết hàng (≤100)</span>
            <span className="legend"><i style={{ background: '#ba1a1a' }} /> Hết hàng (0)</span>
          </div>
        </div>
        <Table
          rowKey="sku" loading={loading} columns={columns} dataSource={filtered} scroll={{ x: 1200 }}
          pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: [10, 20, 50], showTotal: (t) => `Tổng cộng: ${t} mặt hàng tồn kho` }}
          footer={() => <span className="text-muted">Cập nhật gần nhất: {formatDateTime(updatedAt)}</span>}
        />
      </div>
    </div>
  )
}
