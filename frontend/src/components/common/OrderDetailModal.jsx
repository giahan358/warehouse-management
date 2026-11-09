import { Button, Modal, Table, Tag } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, PlayCircleOutlined, WarningOutlined } from '@ant-design/icons'
import StatusTag from './StatusTag'
import { FULFILLMENT_STATUS } from '../../constants/statuses'

const label = { fontSize: 11, color: '#727786', textTransform: 'uppercase' }

export default function OrderDetailModal({ order, onClose, onStart, onShortage }) {
  const items = order?.items ?? []
  const enough = items.every((i) => i.avail >= i.qty)
  const totalQty = items.reduce((s, i) => s + i.qty, 0)
  const canReport = order && ['PENDING', 'PICKING'].includes(order.status)

  const columns = [
    {
      title: 'MÃ SKU / TÊN SẢN PHẨM',
      render: (_, r) => <div><span className="mono-link">{r.sku}</span><div className="text-muted">{r.name}</div></div>,
    },
    { title: 'VỊ TRÍ BIN/RACK', dataIndex: 'bin', render: (v) => <span className="code-chip">{v}</span> },
    { title: 'SL YÊU CẦU (REQ)', dataIndex: 'qty', align: 'center', render: (v, r) => <b>{v} {r.unit}</b> },
    {
      title: 'TỒN KHẢ DỤNG (AVAIL)', dataIndex: 'avail', align: 'center',
      render: (v, r) => <b style={{ color: v >= r.qty ? '#006767' : '#ba1a1a' }}>{v} {r.unit}</b>,
    },
    {
      title: 'ĐỐI SOÁT', align: 'center',
      render: (_, r) => (r.avail >= r.qty ? <Tag color="success">Đủ</Tag> : <Tag color="error">Thiếu</Tag>),
    },
  ]

  return (
    <Modal
      open={!!order}
      onCancel={onClose}
      width={760}
      destroyOnClose
      title={
        <span>
          Chi tiết yêu cầu xuất kho <span className="mono">{order?.id}</span>{' '}
          {order?.urgent && <Tag color="error">Ưu tiên SLA</Tag>}
        </span>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>
            {canReport && (
              <Button danger icon={<WarningOutlined />} onClick={onShortage}>Báo thiếu hàng thực tế</Button>
            )}
          </span>
          <span style={{ display: 'inline-flex', gap: 8 }}>
            <Button onClick={onClose}>Đóng</Button>
            {order?.status === 'PENDING' && (
              <Button type="primary" icon={<PlayCircleOutlined />} onClick={onStart}>Bắt đầu lấy hàng</Button>
            )}
          </span>
        </div>
      }
    >
      {order && (
        <>
          <div className="text-muted" style={{ marginBottom: 12 }}>
            Tạo lúc {order.createdAt} • Khách hàng: {order.customer}{order.contract && ` (HĐ: ${order.contract})`}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, background: '#eff4ff', padding: 12, borderRadius: 8, marginBottom: 16 }}>
            <div>
              <div style={label}>Thông tin người nhận & Địa chỉ</div>
              <b>{order.receiver}{order.phone && ` - ${order.phone}`}</b>
              <div className="text-muted">{order.address}</div>
              <div className="mono text-muted">Đơn vị vận chuyển: {order.carrier} (Mã: {order.tracking})</div>
            </div>
            <div>
              <div style={label}>Trạng thái & Kiểm tra tồn khả dụng</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <StatusTag map={FULFILLMENT_STATUS} status={order.status} />
                {enough
                  ? <span style={{ color: '#006767', fontWeight: 500 }}><CheckCircleOutlined /> Tồn khả dụng (hệ thống): ĐỦ HÀNG</span>
                  : <span style={{ color: '#ba1a1a', fontWeight: 500 }}><CloseCircleOutlined /> Tồn khả dụng (hệ thống): THIẾU HÀNG</span>}
              </div>
              {order.dock && <div className="text-muted">Dock xuất dự kiến: {order.dock}</div>}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <b>Danh sách SKU & Đối soát tồn khả dụng trước khi xuất</b>
            <span className="text-muted mono">Tổng: {String(items.length).padStart(2, '0')} SKU ({String(totalQty).padStart(2, '0')} đơn vị)</span>
          </div>
          <Table rowKey="sku" size="small" columns={columns} dataSource={items} pagination={false} scroll={{ x: 640 }} />
        </>
      )}
    </Modal>
  )
}