import { useCallback, useEffect, useState } from 'react'
import { Button, Drawer, Input, Select, Space, Table, Tag, message } from 'antd'
import { ReloadOutlined, SearchOutlined, MailOutlined } from '@ant-design/icons'
import emailApi from '../../api/emailApi'
import PageHeader from '../../components/common/PageHeader'
import { formatDateTime } from '../../utils/formatDate'

const STATUS = {
  SENT: { label: 'Đã gửi', color: 'success' },
  FAILED: { label: 'Thất bại', color: 'error' },
  PENDING: { label: 'Đang xử lý', color: 'processing' },
}

export default function EmailHistoryPage() {
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('all')
  const [customerId, setCustomerId] = useState('')
  const [orderId, setOrderId] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await emailApi.getHistory({
        page, size: pageSize,
        ...(status !== 'all' ? { status } : {}),
        ...(customerId.trim() ? { customerId: customerId.trim() } : {}),
        ...(orderId.trim() ? { outboundOrderId: orderId.trim() } : {}),
      })
      setRows(result.items)
      setTotal(result.totalElements)
    } catch (error) {
      message.error(error?.response?.data?.error?.message ?? error?.response?.data?.message ?? error.message ?? 'Không tải được lịch sử email')
    } finally { setLoading(false) }
  }, [page, pageSize, status, customerId, orderId])

  useEffect(() => { load() }, [load])

  const openDetail = async (row) => {
    setDetail(row)
    setDetailLoading(true)
    try {
      const fullDetail = await emailApi.getById(row.id)
      if (fullDetail) setDetail(fullDetail)
    } catch (error) {
      message.error(error?.response?.data?.error?.message ?? error?.response?.data?.message ?? error.message ?? 'Không tải được chi tiết email')
    } finally { setDetailLoading(false) }
  }

  const columns = [
    { title: 'THỜI GIAN', dataIndex: 'createdAt', render: (value, row) => <span className="mono">{formatDateTime(row.sentAt ?? value)}</span> },
    { title: 'ĐƠN XUẤT', dataIndex: 'outboundOrderId', render: (value) => value ? <span className="mono-link">#{value}</span> : '—' },
    { title: 'NGƯỜI NHẬN', dataIndex: 'recipientEmail' },
    { title: 'TIÊU ĐỀ EMAIL', dataIndex: 'subject' },
    { title: 'TRẠNG THÁI', dataIndex: 'status', align: 'center', render: (value) => <Tag color={STATUS[value]?.color}>{STATUS[value]?.label ?? value}</Tag> },
    { title: 'CHI TIẾT', align: 'right', render: (_, row) => <Button type="link" onClick={() => openDetail(row)}>Xem email</Button> },
  ]

  return (
    <div className="page">
      <PageHeader eyebrow="PORTAL QUẢN TRỊ / THÔNG BÁO & EMAIL" title="Lịch sử gửi email" subtitle="Theo dõi trạng thái gửi thông báo đơn xuất kho và tra cứu nội dung email." />
      <div className="card-flat" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select value={status} onChange={(value) => { setStatus(value); setPage(0) }} style={{ width: 200 }} options={[{ value: 'all', label: 'Tất cả trạng thái' }, ...Object.entries(STATUS).map(([value, item]) => ({ value, label: item.label }))]} />
          <Input value={customerId} onChange={(event) => { setCustomerId(event.target.value); setPage(0) }} onPressEnter={load} allowClear style={{ width: 200 }} prefix={<SearchOutlined />} placeholder="ID khách hàng" />
          <Input value={orderId} onChange={(event) => { setOrderId(event.target.value); setPage(0) }} onPressEnter={load} allowClear style={{ width: 280 }} prefix={<SearchOutlined />} placeholder="Mã ID đơn xuất" />
          <Button icon={<ReloadOutlined />} onClick={load}>Làm mới</Button>
        </Space>
      </div>
      <div className="card-flat" style={{ padding: 0 }}>
        <div style={{ padding: 16 }}><b><MailOutlined /> Lịch sử thông báo <span className="chip">{total} email</span></b></div>
        <Table rowKey="id" loading={loading} columns={columns} dataSource={rows} scroll={{ x: 1000 }}
          pagination={{ current: page + 1, pageSize, total, showSizeChanger: true, pageSizeOptions: [10, 20, 50], showTotal: (count) => `Tổng cộng ${count} email`, onChange: (current, size) => { setPage(current - 1); setPageSize(size) }, style: { padding: '0 16px' } }} />
      </div>
      <Drawer open={!!detail} onClose={() => setDetail(null)} width={560} title="Chi tiết email" loading={detailLoading}>
        {detail && <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <div><b>Người nhận:</b> {detail.recipientEmail || '—'}</div>
          <div><b>Tiêu đề:</b> {detail.subject || '—'}</div>
          <div><b>Trạng thái:</b> <Tag color={STATUS[detail.status]?.color}>{STATUS[detail.status]?.label ?? detail.status}</Tag></div>
          <div><b>Thời gian gửi:</b> {formatDateTime(detail.sentAt ?? detail.createdAt)}</div>
          {detail.errorMessage && <div><b>Lỗi gửi:</b> {detail.errorMessage}</div>}
          <div><b>Nội dung:</b><pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{detail.content || '—'}</pre></div>
        </Space>}
      </Drawer>
    </div>
  )
}
