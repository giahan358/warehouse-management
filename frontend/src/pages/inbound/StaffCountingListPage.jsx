import { useEffect, useState } from 'react'
import { Button, Progress, Table, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import inboundApi from '../../api/inboundApi'
import PageHeader from '../../components/common/PageHeader'
import StatusTag from '../../components/common/StatusTag'
import { INBOUND_STATUS } from '../../constants/statuses'

// Danh sách phiếu đang kiểm đếm (RECEIVING) → mở phiếu để đếm & xác nhận
export default function StaffCountingListPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    inboundApi.getSchedule({ page: 0, size: 100 }).then((d) => {
      setRows(d.filter((r) => r.status === 'RECEIVING'))
      setLoading(false)
    }).catch((error) => {
      message.error(error?.response?.data?.message ?? error.message ?? 'Không tải được danh sách phiếu kiểm đếm')
      setLoading(false)
    })
  }, [])

  const columns = [
    { title: 'MÃ PHIẾU', dataIndex: 'id', render: (v) => <span className="mono-link">{v}</span> },
    { title: 'KHÁCH HÀNG CHỦ HÀNG', dataIndex: 'customer' },
    { title: 'XE / DOCK', render: (_, r) => <span className="mono" style={{ fontSize: 12 }}>{r.truck}<div className="text-muted">{r.dock}</div></span> },
    { title: 'DỰ KIẾN', render: (_, r) => <span><b>{r.qtyLabel}</b> <span className="text-muted">/ {r.skuCount} SKU</span></span> },
    { title: 'TIẾN ĐỘ DỠ HÀNG', width: 180, render: (_, r) => <Progress percent={r.progress ?? 0} size="small" /> },
    { title: 'TRẠNG THÁI', dataIndex: 'status', render: (v) => <StatusTag map={INBOUND_STATUS} status={v} /> },
    {
      title: '', align: 'right',
      render: (_, r) => <Button type="primary" size="small" onClick={() => navigate(`/staff/counting/${r.receiptId ?? r.id}`)}>Mở phiếu kiểm đếm</Button>,
    },
  ]

  return (
    <div className="page">
      <PageHeader
        eyebrow="KIỂM ĐẾM & XÁC NHẬN THỰC TẾ"
        title="Phiếu kiểm đếm đang mở"
        subtitle="Chọn phiếu ở trạng thái RECEIVING để đếm số lượng thực tế và xác nhận nhập kho."
      />
      <div className="card-flat">
        <Table rowKey="id" loading={loading} columns={columns} dataSource={rows} pagination={false} scroll={{ x: 900 }}
          locale={{ emptyText: 'Không có phiếu nào đang kiểm đếm' }} />
      </div>
    </div>
  )
}
