import { useEffect, useState } from 'react'
import { Button, Input, Select, Table, Tabs, Tag } from 'antd'
import { SyncOutlined } from '@ant-design/icons'
import outboundApi from '../../api/outboundApi'
import paymentApi from '../../api/paymentApi'
import PageHeader from '../../components/common/PageHeader'
import StatusTag from '../../components/common/StatusTag'
import ConfirmModal from '../../components/common/ConfirmModal'
import { OUTBOUND_STATUS } from '../../constants/statuses'
import { formatCurrency } from '../../utils/formatCurrency'

export default function OutboundListPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('cod')
  const [confirmRow, setConfirmRow] = useState(null)

  useEffect(() => { outboundApi.getAll().then((d) => { setRows(d); setLoading(false) }) }, [])

  const confirmCod = async () => {
    try { await paymentApi.confirmCod(confirmRow.id) } catch { /* mock: chưa có BE */ }
    setRows((rs) => rs.map((r) => (r.id === confirmRow.id ? { ...r, codConfirmed: true } : r)))
    setConfirmRow(null)
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
        { key: 'out', label: <>Đơn Xuất Kho (Outbound) <span className="chip">142</span></> },
        { key: 'cod', label: <>Đối Soát & Xác Nhận COD <span className="chip">18 Đơn Chờ</span></> },
      ]} />

      

      <div className="card-flat" style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div><div className="text-muted">Đơn Vị Vận Chuyển</div>
          <Select style={{ width: 220 }} defaultValue="all" options={[{ value: 'all', label: 'Tất cả đơn vị (GHN, Viettel...)' }, { value: 'GHN', label: 'GHN' }, { value: 'Viettel Post', label: 'Viettel Post' }]} /></div>
        <div><div className="text-muted">Trạng Thái Đối Soát COD</div>
          <Select style={{ width: 200 }} defaultValue="all" options={[{ value: 'all', label: 'Tất cả trạng thái COD' }]} /></div>
        <div style={{ marginLeft: 'auto' }}><div className="text-muted">Mã Vận Đơn / Phiếu Xuất</div>
          <Input style={{ width: 260 }} placeholder="Vd: OUT-2024-001 hoặc mã vận đơn" /></div>
      </div>

      <div className="card-flat" style={{ padding: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: 16 }}>
          <b style={{ fontSize: 16 }}>Danh Sách Bàn Giao & Dòng Tiền COD <span className="chip">5 đơn ghi nhận</span></b>
          <span className="mono text-muted"><SyncOutlined style={{ color: '#006767' }} /> Dữ liệu đồng bộ lúc 15:42 (Cổng API Webhook 3PL)</span>
        </div>
        <Table rowKey="id" loading={loading} columns={columns} dataSource={rows} scroll={{ x: 1100 }}
          pagination={{ total: 75, pageSize: 5, showSizeChanger: false, style: { padding: '0 16px' } }} />
      </div>

      <ConfirmModal open={!!confirmRow} title="Xác nhận đã thu tiền COD"
        content={`Xác nhận đã nhận ${formatCurrency(confirmRow?.cod)} COD của phiếu ${confirmRow?.id}? Hệ thống sẽ tự động cấn trừ công nợ phí lưu kho.`}
        onOk={confirmCod} onCancel={() => setConfirmRow(null)} />
    </div>
  )
}
