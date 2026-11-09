import { useEffect, useState } from 'react'
import { Button, Modal, Table } from 'antd'
import { CheckSquareOutlined, InfoCircleOutlined } from '@ant-design/icons'
import inboundApi from '../../api/inboundApi'
import { formatNumber } from '../../utils/formatCurrency'

const label = { fontSize: 11, color: '#727786', textTransform: 'uppercase' }

export default function AsnDetailModal({ open, receiptId, onClose, onCount }) {
  // Lưu kết quả kèm id; chỉ setState trong callback của API, không setState đồng bộ trong effect
  const [result, setResult] = useState({ id: null, data: null })

  useEffect(() => {
    if (!open || !receiptId) return
    let cancelled = false
    inboundApi.getAsnDetail(receiptId).then((data) => {
      if (!cancelled) setResult({ id: receiptId, data })
    })
    return () => { cancelled = true }
  }, [open, receiptId])

  const asn = result.id === receiptId ? result.data : null
  const loading = open && !asn

  const columns = [
    { title: 'STT', width: 60, render: (_, __, i) => String(i + 1).padStart(2, '0') },
    { title: 'MÃ SKU', dataIndex: 'sku', render: (v) => <span className="mono-link">{v}</span> },
    { title: 'TÊN SẢN PHẨM', dataIndex: 'name' },
    { title: 'ĐƠN VỊ', dataIndex: 'unit' },
    { title: 'SL DỰ KIẾN', dataIndex: 'expected', align: 'right', render: (v) => <b className="mono">{formatNumber(v)}</b> },
    {
      title: 'SL THỰC ĐẾM', dataIndex: 'actual', align: 'right',
      render: (v) => (v == null ? <span className="text-muted">-- (Chờ đếm)</span> : <b className="mono">{formatNumber(v)}</b>),
    },
    { title: 'VỊ TRÍ DỰ KIẾN', dataIndex: 'bin', align: 'center', render: (v) => <span className="code-chip">{v}</span> },
  ]

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={900}
      destroyOnClose
      title={
        <span>
          Chi tiết Phiếu Nhập Kho ASN: <span className="mono">{receiptId}</span>{' '}
          {asn && <span className="chip">{asn.dockLabel}</span>}
        </span>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={onClose}>Đóng</Button>
          <span style={{ display: 'inline-flex', gap: 8 }}>
            <Button type="primary" icon={<CheckSquareOutlined />} disabled={!asn} onClick={onCount}>
              Vào màn hình Kiểm đếm & Nhập SL thực tế
            </Button>
          </span>
        </div>
      }
    >
      <div className="text-muted" style={{ marginBottom: 12 }}>
        Khách hàng: {asn ? `${asn.customer} (${asn.customerCode})` : '...'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, background: '#eff4ff', padding: 12, borderRadius: 8, marginBottom: 16 }}>
        <div>
          <div style={label}>Thông tin phương tiện</div>
          <b>{asn?.vehicle ?? '--'}</b>
        </div>
        <div>
          <div style={label}>Thời gian dự kiến & Cửa Dock</div>
          <b>{asn?.window ?? '--'}</b>
          <div style={{ color: '#0057c2', fontWeight: 600, fontSize: 12 }}>Dock tiếp nhận: {asn?.dock ?? '--'}</div>
        </div>
        <div>
          <div style={label}>Quy mô lô hàng</div>
          <b>{asn ? `${asn.palletCount} Pallet (Tổng ${formatNumber(asn.totalPackages)} kiện)` : '--'}</b>
          <div style={{ color: '#006767', fontWeight: 600, fontSize: 12 }}>{asn?.weightNote}</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <b>Danh sách hàng hóa khai báo theo ASN</b>
        <span className="text-muted">{asn?.lines.length ?? 0} SKU khai báo</span>
      </div>
      <Table rowKey="sku" size="small" loading={loading} columns={columns} dataSource={asn?.lines ?? []} pagination={false} scroll={{ x: 760 }} />

      <div style={{ marginTop: 16, padding: 8, background: '#e6f0ff', borderRadius: 8, fontSize: 13 }}>
        <InfoCircleOutlined style={{ color: '#0057c2' }} /> Bước tiếp theo: quét barcode từng Pallet và kiểm đếm thực tế để đối soát độ lệch so với ASN.
      </div>
    </Modal>
  )
}