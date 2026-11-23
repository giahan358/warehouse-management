import { useCallback, useEffect, useState } from 'react'
import { Button, Input, Select, Table, Tabs, Tag, message } from 'antd'
import { SyncOutlined } from '@ant-design/icons'
import outboundApi from '../../api/outboundApi'
import paymentApi from '../../api/paymentApi'
import { USE_MOCK } from '../../api/axiosClient'
import PageHeader from '../../components/common/PageHeader'
import StatusTag from '../../components/common/StatusTag'
import ConfirmModal from '../../components/common/ConfirmModal'
import { OUTBOUND_STATUS } from '../../constants/statuses'
import { formatCurrency } from '../../utils/formatCurrency'

export default function OutboundListPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('out')
  const [confirmRow, setConfirmRow] = useState(null)
  const [codSummary, setCodSummary] = useState(null)
  const [outboundCount, setOutboundCount] = useState(0)
  const [codCount, setCodCount] = useState(0)
  const [keyword, setKeyword] = useState('')
  const [carrierFilter, setCarrierFilter] = useState('all')
  const [codStatusFilter, setCodStatusFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = tab === 'cod' ? await paymentApi.getCodOrders({ page: 0, size: 100 }) : await outboundApi.getAll({ page: 0, size: 100 })
      setRows(data)
      if (tab === 'cod') {
        try {
          const summary = await paymentApi.getCodSummary()
          setCodSummary(summary)
          setCodCount(summary.pendingCount ?? data.length)
        } catch (error) {
          setCodCount(data.length)
          throw error
        }
      } else {
        setOutboundCount(data.length)
      }
    } catch (error) {
      message.error(error?.response?.data?.error?.message ?? error?.response?.data?.message ?? error.message ?? 'Không tải được dữ liệu đơn xuất')
    } finally { setLoading(false) }
  }, [tab])
  useEffect(() => { load() }, [load])

  const filteredRows = rows.filter((row) =>
    (carrierFilter === 'all' || row.carrier === carrierFilter) &&
    (codStatusFilter === 'all' || row.codStatus === codStatusFilter) &&
    `${row.id} ${row.waybill} ${row.customer} ${row.receiver} ${row.address}`.toLowerCase().includes(keyword.trim().toLowerCase()))

  const confirmCod = async () => {
    try {
      const orderId = confirmRow.orderId ?? confirmRow.id
      if (confirmRow.codStatus !== 'COLLECTED') await paymentApi.updateCodStatus(orderId, 'COLLECTED')
      await paymentApi.confirmCod(orderId)
      message.success(`Đã xác nhận đối soát COD ${confirmRow.id}`)
      if (USE_MOCK) setRows((current) => current.map((row) => row.id === confirmRow.id ? { ...row, codConfirmed: true, codStatus: 'CONFIRMED' } : row))
      setConfirmRow(null)
      if (!USE_MOCK) await load()
    } catch (error) {
      message.error(error?.response?.data?.error?.message ?? error?.response?.data?.message ?? error.message ?? 'Không xác nhận được COD')
    }
  }

  const columns = [
    { title: 'MÃ PHIẾU XUẤT', dataIndex: 'id', width: 130, render: (v) => <span className="mono-link">{v}</span> },
    {
      title: 'MÃ VẬN ĐƠN', width: 190,
      render: (_, r) => (
        <div className="mono" style={{ fontSize: 12 }}>
          {r.waybill}
          <div className="text-muted"><span style={{ color: r.carrier === 'GHN' ? '#0057c2' : '#466082' }}>●</span> {r.carrier}</div>
        </div>
      ),
    },
    { title: 'KHÁCH HÀNG (CHỦ HÀNG)', dataIndex: 'customer', width: 170, render: (v) => <b>{v}</b> },
    {
      title: 'NGƯỜI NHẬN & ĐỊA CHỈ',
      render: (_, r) => (
        <div>
          <b style={{ fontWeight: 500 }}>{r.receiver}</b>
          <div className="text-muted">{r.address}</div>
        </div>
      ),
    },
    {
      title: 'SỐ TIỀN COD', align: 'right',
      render: (_, r) => (
        <div className="mono" style={{ fontSize: 12 }}>
          <b style={{ color: r.status === 'DELIVERED' ? '#006767' : r.status === 'RETURNED' ? '#ba1a1a' : undefined }}>{formatCurrency(r.cod)}</b>
          {r.originalCod && <div className="text-muted">Gốc: {formatCurrency(r.originalCod)}</div>}
        </div>
      ),
    },
    { title: 'TRẠNG THÁI VẬN CHUYỂN', dataIndex: 'status', align: 'center', render: (v) => <StatusTag map={OUTBOUND_STATUS} status={v} /> },
    {
      title: 'ĐỐI SOÁT COD', align: 'center',
      render: (_, r) => {
        if (r.status !== 'DELIVERED') return <span className="text-muted">—</span>
        if (r.codConfirmed) return <Tag color="success">SUCCESS</Tag>
        return <Button size="small" type="primary" onClick={() => setConfirmRow(r)}>Xác nhận COD</Button>
      },
    },
  ]

  return (
    <div className="page">
      <PageHeader
        eyebrow="LOGISTORAGE / OPERATIONS & FINANCE"
        title="Quản lý Xuất Kho"
        subtitle="Hệ thống kiểm soát luồng hàng outbound, đồng bộ trạng thái giao vận và dòng tiền thu hộ đa sàn/3PL."
      />

      <Tabs activeKey={tab} onChange={setTab} items={[
        { key: 'out', label: <>Đơn Xuất Kho (Outbound) <span className="chip">{outboundCount}</span></> },
        { key: 'cod', label: <>Đối Soát & Xác Nhận COD <span className="chip">{codSummary?.pendingCount ?? codCount} Đơn Chờ</span></> },
      ]} />

      

      <div className="card-flat" style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div><div className="text-muted">Đơn Vị Vận Chuyển</div>
          <Select style={{ width: 220 }} value={carrierFilter} onChange={setCarrierFilter} options={[{ value: 'all', label: 'Tất cả đơn vị (GHN, Viettel...)' }, ...[...new Set(rows.map((row) => row.carrier).filter((value) => value && value !== '—'))].map((value) => ({ value, label: value }))]} /></div>
        <div><div className="text-muted">Trạng Thái Đối Soát COD</div>
          <Select style={{ width: 200 }} value={codStatusFilter} onChange={setCodStatusFilter} options={[{ value: 'all', label: 'Tất cả trạng thái COD' }, { value: 'NONE', label: 'Không thu COD' }, { value: 'PENDING_RECONCILE', label: 'Chờ đối soát' }, { value: 'COLLECTED', label: 'Đã thu' }, { value: 'CONFIRMED', label: 'Đã xác nhận' }, { value: 'RETURNED', label: 'Đã hoàn' }]} /></div>
        <div style={{ marginLeft: 'auto' }}><div className="text-muted">Mã Vận Đơn / Phiếu Xuất</div>
          <Input style={{ width: 260 }} value={keyword} onChange={(event) => setKeyword(event.target.value)} allowClear placeholder="Vd: OUT-2024-001 hoặc mã vận đơn" /></div>
      </div>

      <div className="card-flat" style={{ padding: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: 16 }}>
          <b style={{ fontSize: 16 }}>Danh Sách Bàn Giao & Dòng Tiền COD <span className="chip">{filteredRows.length} đơn ghi nhận</span></b>
          <span className="mono text-muted"><SyncOutlined style={{ color: '#006767' }} /> Dữ liệu đồng bộ lúc 15:42 (Cổng API Webhook 3PL)</span>
        </div>
        <Table rowKey="id" loading={loading} columns={columns} dataSource={filteredRows} scroll={{ x: 1100 }}
          pagination={{ total: filteredRows.length, pageSize: 5, showSizeChanger: false, style: { padding: '0 16px' } }} />
      </div>

      <ConfirmModal open={!!confirmRow} title="Xác nhận đã thu tiền COD"
        content={`Xác nhận đã nhận ${formatCurrency(confirmRow?.cod)} COD của phiếu ${confirmRow?.id}? Hệ thống sẽ tự động cấn trừ công nợ phí lưu kho.`}
        onOk={confirmCod} onCancel={() => setConfirmRow(null)} />
    </div>
  )
}
