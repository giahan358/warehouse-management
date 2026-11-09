import { useEffect, useState } from 'react'
import { Button, Drawer, Spin, message } from 'antd'
import { ExportOutlined, HistoryOutlined, ImportOutlined, PrinterOutlined, SwapOutlined, WarningOutlined } from '@ant-design/icons'
import inventoryApi from '../../api/inventoryApi'
import PopupHeader, { drawerStyles } from '../common/PopupHeader'
import { formatNumber } from '../../utils/formatCurrency'

const TYPE_STYLE = {
  OUTBOUND: { icon: <ExportOutlined />, color: '#0057c2', bg: '#dce9ff' },
  INBOUND: { icon: <ImportOutlined />, color: '#006767', bg: '#bff6f6' },
  RELOCATE: { icon: <SwapOutlined />, color: '#414755', bg: '#e5eeff' },
  DAMAGE: { icon: <WarningOutlined />, color: '#ba1a1a', bg: '#ffdad6' },
}

// Drawer "Thẻ kho & lịch sử biến động tồn" của 1 SKU
export default function StockHistoryDrawer({ open, item, onClose }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !item) return
    setLoading(true)
    setLogs([])
    inventoryApi.getStockHistory(item.sku).then(setLogs).finally(() => setLoading(false))
  }, [open, item])

  return (
    <Drawer open={open} onClose={onClose} width={480} styles={drawerStyles}
      title={item && <PopupHeader icon={<HistoryOutlined />} title={<span className="mono-link" style={{ fontSize: 15 }}>{item.sku}</span>}
        subtitle="Thẻ Kho & Lịch Sử Biến Động Tồn (Stock Card)" />}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button icon={<PrinterOutlined />} onClick={() => message.info('Đang xuất Thẻ Kho PDF...')}>In Thẻ Kho PDF</Button>
          <Button type="primary" onClick={onClose}>Đóng Lại</Button>
        </div>
      }>
      {item && (
        <>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>{item.name}</div>
          <div style={{ background: '#eff4ff', borderRadius: 8, padding: 12, marginBottom: 16 }}>
            {[
              ['Tồn kho hiện tại:', <b className="mono">{formatNumber(item.onHand)} {item.unit}</b>],
              ['Vị trí lưu kho:', <span className="chip mono">{item.bin}</span>],
              ['Khách hàng:', item.owner],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                <span className="text-muted">{k}</span><span>{v}</span>
              </div>
            ))}
          </div>

          <div className="eyebrow" style={{ marginBottom: 8 }}>NHẬT KÝ GIAO DỊCH GẦN NHẤT</div>
          <Spin spinning={loading}>
            {!loading && logs.length === 0 && <div className="text-muted">Chưa có giao dịch nào.</div>}
            {logs.map((l, i) => {
              const s = TYPE_STYLE[l.type]
              return (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid #e5eeff' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: s.bg, color: s.color, display: 'grid', placeItems: 'center', flex: 'none' }}>{s.icon}</div>
                  <div style={{ flex: 1, lineHeight: 1.4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <b>{l.title}</b>
                      {l.delta != null && (
                        <b className="mono" style={{ color: l.delta > 0 ? '#006767' : '#ba1a1a' }}>
                          {l.delta > 0 ? '+' : ''}{formatNumber(l.delta)} {item.unit}
                        </b>
                      )}
                      {l.route && <b className="mono-link">{l.route}</b>}
                    </div>
                    <div className="text-muted">{l.note}</div>
                    {l.extra && <div className="text-muted">{l.extra}</div>}
                    {l.after != null && <div className="mono text-muted">Tồn sau GD: {formatNumber(l.after)}</div>}
                    <div className="text-muted" style={{ marginTop: 2 }}>{l.time} ({l.by})</div>
                  </div>
                </div>
              )
            })}
          </Spin>
        </>
      )}
    </Drawer>
  )
}
