import { useEffect, useState } from 'react'
import { Button, Modal, QRCode, message } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, CreditCardOutlined, QrcodeOutlined, WifiOutlined } from '@ant-design/icons'
import paymentApi from '../../api/paymentApi'
import PopupHeader, { modalStyles } from '../common/PopupHeader'
import { formatCurrency } from '../../utils/formatCurrency'

const METHODS = [
  { value: 'QR', label: 'VNPAY-QR', icon: <QrcodeOutlined /> },
  { value: 'ATM', label: 'Thẻ Nội Địa / ATM', icon: <CreditCardOutlined /> },
  { value: 'VISA', label: 'Thẻ Quốc Tế (Visa)', icon: <WifiOutlined /> },
]

// Cổng thanh toán VNPay Sandbox + giả lập webhook IPN
// onResult(invoice, rspCode): '00' = thành công, '24' = khách hủy
export default function VnpayModal({ open, invoice, onClose, onResult }) {
  const [method, setMethod] = useState('QR')
  const [loading, setLoading] = useState(null)

  useEffect(() => { if (open) setMethod('QR') }, [open])

  const simulate = async (rspCode) => {
    setLoading(rspCode)
    try {
      await paymentApi.simulateIpn(invoice.id, rspCode)
      if (rspCode === '00') message.success(`IPN 00: Hóa đơn ${invoice.id} đã thanh toán`)
      else message.warning(`IPN 24: Giao dịch ${invoice.id} bị hủy bởi người dùng`)
      onResult?.(invoice, rspCode)
      onClose()
    } catch (e) {
      message.error(e?.response?.data?.message ?? 'Không gửi được IPN giả lập')
    } finally {
      setLoading(null)
    }
  }

  const payUrl = invoice
    ? `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=${invoice.id}&vnp_Amount=${invoice.total * 100}`
    : ''

  return (
    <Modal open={open} onCancel={onClose} footer={null} width={480} centered styles={modalStyles}
      title={<PopupHeader icon={<b style={{ fontSize: 12 }}>VNP</b>} title="Cổng Thanh Toán VNPay Sandbox"
        subtitle="Môi trường kiểm thử tích hợp (vnp_Version: 2.1.0)" />}>
      {invoice && (
        <>
          <div style={{ background: '#eff4ff', borderRadius: 8, padding: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-muted">Mã đơn hàng đối soát:</span><b className="mono-link">{invoice.id}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span className="text-muted">Số tiền cần thanh toán:</span><b className="mono" style={{ fontSize: 16 }}>{formatCurrency(invoice.total)}</b>
            </div>
          </div>

          <div style={{ fontWeight: 600, marginBottom: 8 }}>Chọn phương thức thanh toán Sandbox:</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
            {METHODS.map((m) => (
              <button key={m.value} type="button" onClick={() => setMethod(m.value)}
                style={{
                  cursor: 'pointer', padding: '10px 6px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                  border: `2px solid ${method === m.value ? '#0057c2' : '#c1c6d7'}`,
                  background: method === m.value ? '#eff4ff' : '#fff', color: method === m.value ? '#0057c2' : '#414755',
                }}>
                <div style={{ fontSize: 20 }}>{m.icon}</div>{m.label}
              </button>
            ))}
          </div>

          <div style={{ textAlign: 'center', border: '1px dashed #c1c6d7', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            {method === 'QR' && <QRCode value={payUrl} size={150} style={{ margin: '0 auto 8px' }} />}
            <div className="text-muted">
              {method === 'QR' ? 'Quét mã bằng App Ngân Hàng Sandbox (NCB / BIDV)' : 'Nhập thông tin thẻ test trên cổng VNPay Sandbox'}
            </div>
            <div className="mono" style={{ fontSize: 12, marginTop: 4 }}>Tài khoản Test: NCB - 9704198526191432198</div>
          </div>

          <div className="text-muted" style={{ marginBottom: 8 }}>Hoặc giả lập kết quả gửi Webhook IPN từ VNPay Server:</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Button type="primary" icon={<CheckCircleOutlined />} loading={loading === '00'} disabled={!!loading && loading !== '00'}
              style={{ background: '#006767' }} onClick={() => simulate('00')}>Giả lập PAID (RspCode 00)</Button>
            <Button danger icon={<CloseCircleOutlined />} loading={loading === '24'} disabled={!!loading && loading !== '24'}
              onClick={() => simulate('24')}>Giả lập THẤT BẠI (RspCode 24)</Button>
          </div>
        </>
      )}
    </Modal>
  )
}
