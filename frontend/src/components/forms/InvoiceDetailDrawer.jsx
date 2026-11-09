import { useEffect, useState } from 'react'
import { Button, Drawer, Spin, Table, message } from 'antd'
import { PrinterOutlined, QrcodeOutlined, FileTextOutlined } from '@ant-design/icons'
import invoiceApi from '../../api/invoiceApi'
import PopupHeader, { drawerStyles } from '../common/PopupHeader'
import PopupSection from '../common/PopupSection'
import { INVOICE_STATUS } from '../../constants/statuses'
import { formatCurrency } from '../../utils/formatCurrency'

const Row = ({ k, v }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '3px 0' }}>
    <span className="text-muted">{k}</span><span style={{ textAlign: 'right', fontWeight: 500 }}>{v}</span>
  </div>
)

// Drawer "Chi tiết hóa đơn" — bảng kê phí + nhật ký giao dịch VNPay
export default function InvoiceDetailDrawer({ open, invoice, onClose, onOpenVnpay }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !invoice) return
    setLoading(true)
    setDetail(null)
    invoiceApi.getDetail(invoice.id).then(setDetail).finally(() => setLoading(false))
  }, [open, invoice])

  const st = invoice ? INVOICE_STATUS[invoice.status] : null

  const columns = [
    {
      title: 'Hạng mục dịch vụ', dataIndex: 'name',
      render: (v, r) => (<div><b style={{ fontWeight: 500 }}>{v}</b><div className="text-muted">{r.spec}</div></div>),
    },
    { title: 'Khối lượng / SL', dataIndex: 'qty', align: 'right', render: (v) => <span className="mono">{v}</span> },
    { title: 'Đơn giá', align: 'right', render: (_, r) => <span className="mono">{formatCurrency(r.price)}{r.priceUnit}</span> },
    { title: 'Thành tiền', dataIndex: 'amount', align: 'right', render: (v) => <b className="mono">{formatCurrency(v)}</b> },
  ]

  return (
    <Drawer open={open} onClose={onClose} width={680} styles={drawerStyles}
      title={<PopupHeader icon={<FileTextOutlined />} title={`Chi Tiết Hóa Đơn ${invoice?.id ?? ''}`} subtitle="Mã biểu phí cước kho vận & Giao dịch VNPay" />}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={onClose}>Đóng</Button>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button icon={<PrinterOutlined />} onClick={() => message.info('Đang chuẩn bị phiếu xuất cước...')}>In phiếu xuất cước</Button>
            <Button type="primary" icon={<QrcodeOutlined />} onClick={() => onOpenVnpay?.(invoice)}>Mở VNPay Gateway URL</Button>
          </div>
        </div>
      }>
      <Spin spinning={loading}>
        {st && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 8, marginBottom: 16,
            background: st.bg, border: `1px solid ${st.border}`, color: st.color }}>
            <div>
              <div className="eyebrow" style={{ color: st.color }}>Trạng thái thanh toán</div>
              <b style={{ fontSize: 16 }}>{st.label}</b>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="eyebrow" style={{ color: st.color }}>Tổng số tiền thanh toán</div>
              <b className="mono" style={{ fontSize: 20 }}>{formatCurrency(invoice.total)}</b>
            </div>
          </div>
        )}

        {detail && (
          <>
            <PopupSection title="Thông tin Khách Hàng Doanh Nghiệp (Chủ Hàng)">
              <Row k="Doanh nghiệp:" v={detail.customer} />
              <Row k="Mã số thuế:" v={<span className="mono">{detail.tax}</span>} />
              <Row k="Địa chỉ đăng ký cước:" v={detail.address} />
              <Row k="Vị trí thuê:" v={detail.location} />
            </PopupSection>

            <PopupSection title="Bảng kê chi tiết phí dịch vụ kho vận phát sinh">
              <Table size="small" rowKey="name" pagination={false} columns={columns} dataSource={detail.items} />
              <div style={{ textAlign: 'right', marginTop: 12 }}>
                <div>Cộng tiền dịch vụ: <b className="mono">{formatCurrency(detail.subtotal)}</b></div>
                <div>Thuế GTGT (VAT 8%): <b className="mono">{formatCurrency(detail.vat)}</b></div>
                <div style={{ color: '#0057c2', fontWeight: 700 }}>Tổng tiền thanh toán cước: <span className="mono">{formatCurrency(detail.total)}</span></div>
              </div>
            </PopupSection>

            <PopupSection title="Nhật Ký Giao Dịch Cổng VNPay Sandbox" style={{ marginBottom: 0 }}>
              {detail.vnpay ? (
                <div className="mono" style={{ fontSize: 12 }}>
                  <Row k="vnp_TxnRef:" v={detail.vnpay.txnRef} />
                  <Row k="vnp_TransactionNo:" v={detail.vnpay.transactionNo} />
                  <Row k="vnp_BankCode:" v={detail.vnpay.bankCode} />
                  <Row k="vnp_PayDate:" v={detail.vnpay.payDate} />
                  <Row k="vnp_SecureHash:" v={<span style={{ wordBreak: 'break-all' }}>{detail.vnpay.secureHash}</span>} />
                </div>
              ) : (
                <div className="text-muted">Chưa có giao dịch VNPay cho hóa đơn này.</div>
              )}
            </PopupSection>
          </>
        )}
        {!loading && !detail && <div className="text-muted">Không tìm thấy dữ liệu chi tiết của hóa đơn.</div>}
      </Spin>
    </Drawer>
  )
}
