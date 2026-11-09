import { useEffect, useState } from 'react'
import { Col, Row, Segmented } from 'antd'
import {
  AppstoreOutlined, ShopOutlined, ImportOutlined, ExportOutlined,
  DollarOutlined, CheckCircleOutlined,  LineChartOutlined, BankOutlined, FileTextOutlined,
} from '@ant-design/icons'
import { Link } from 'react-router-dom'
import { getAdminDashboard } from '../../api/dashboardApi'
import Loading from '../../components/common/Loading'
import SegmentedBar from '../../components/common/SegmentedBar'
import FlowChart from '../../components/common/FlowChart'
import { formatCurrency, formatNumber } from '../../utils/formatCurrency'

function Kpi({ label, icon, children, foot }) {
  return (
    <div className="kpi">
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span className="label">{label}</span>
        <span style={{ color: '#006767', fontSize: 18 }}>{icon}</span>
      </div>
      {children}
      {foot}
    </div>
  )
}

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [range, setRange] = useState('Ngày')

  useEffect(() => { getAdminDashboard().then(setData) }, [])
  if (!data) return <Loading />
  const { kpi, flow, tenants } = data

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>Trung tâm Điều hành Kho vận Toàn diện</h1>
        <span className="chip" style={{ padding: '6px 12px', fontSize: 12 }}>
          
        </span>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={{ flex: '20%' }}>
          <Kpi label="Tỷ lệ lấp đầy kho (m³)" icon={<AppstoreOutlined />}
            foot={
              <div style={{ marginTop: 16 }}>
                <SegmentedBar parts={[
                  { value: kpi.capacity.percent - 15, color: '#0057c2' },
                  { value: 15, color: '#006767' },
                ]} />
                <div className="text-muted mono" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  <span>Chiếm dụng: {kpi.capacity.percent}%</span>
                  <span>Dự phòng: {formatNumber(kpi.capacity.reserved)} m³</span>
                </div>
              </div>
            }>
            <div className="value">{kpi.capacity.percent}%</div>
            <div className="mono" style={{ fontWeight: 600, fontSize: 12 }}>
              {formatNumber(kpi.capacity.used)} / {formatNumber(kpi.capacity.total)} m³
            </div>
          </Kpi>
        </Col>

        <Col xs={24} md={12} xl={{ flex: '20%' }}>
          <Kpi label="Khách hàng B2B (Tenant)" icon={<ShopOutlined />}
            foot={<div className="foot"><span>SLA Kim Cương / Vàng</span><b style={{ color: '#0057c2' }}>{kpi.customers.contracts} hợp đồng</b></div>}>
            <div><span className="value">{kpi.customers.active}</span> <span style={{ color: '#0057c2', fontSize: 12 }}>đang hoạt động</span></div>
            <div style={{ color: '#ba1a1a', fontSize: 12 }}>● {kpi.customers.locked} tài khoản LOCKED nợ cước</div>
          </Kpi>
        </Col>

        <Col xs={24} md={12} xl={{ flex: '20%' }}>
          <Kpi label="Nhập kho ASN" icon={<ImportOutlined />}
            foot={<div className="foot"><span>Tiến độ Dock A-D</span><b style={{ color: '#0057c2' }}>{kpi.inbound.docking} đang bốc dỡ & đếm</b></div>}>
            <div><span className="value">{kpi.inbound.today}</span> <span className="chip">phiếu hẹn hôm nay</span></div>
            <div className="text-muted">Check-in Dock: {kpi.inbound.parcels} kiện tiếp nhận</div>
          </Kpi>
        </Col>

        <Col xs={24} md={12} xl={{ flex: '20%' }}>
          <Kpi label="Xuất kho & COD" icon={<ExportOutlined />}
            foot={<div className="foot"><span>Quy trình DB 4 bước</span><b>PREPARING trừ tồn</b></div>}>
            <div><span className="value">{kpi.outbound.orders}</span> <span className="text-muted">lệnh xuất kho</span></div>
            <div className="mono" style={{ color: '#006767', fontWeight: 600, fontSize: 12 }}>
              COD 3PL: {formatCurrency(kpi.outbound.cod)}
            </div>
          </Kpi>
        </Col>

        <Col xs={24} md={12} xl={{ flex: '20%' }}>
          <Kpi label="Cước dịch vụ kho vận" icon={<DollarOutlined />}
            foot={<div className="foot"><span>Cơ cấu: Phí lưu kho + DV</span><b>Không thu bán lẻ</b></div>}>
            <div className="value" style={{ color: '#0057c2', textDecoration: 'underline' }}>{kpi.fee.total} ₫</div>
            <div style={{ color: '#006767', fontSize: 12 }}><CheckCircleOutlined /> VNPay Sandbox & Cấn trừ COD</div>
          </Kpi>
        </Col>
      </Row>

      <div className="card-flat" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}><LineChartOutlined /> Lưu lượng Hàng hóa Nhập - Xuất (30 Ngày Qua)</div>
            <div className="text-muted mono">Tổng tích lũy: 42,850 CBM Nhập | 38,120 CBM Xuất</div>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 12 }}>
            <span><span style={{ color: '#0057c2' }}>●</span> Nhập kho (Inbound)</span>
            <span><span style={{ color: '#006767' }}>●</span> Xuất kho (Outbound)</span>
            <Segmented size="small" value={range} onChange={setRange} options={['Ngày', 'Tuần']} />
          </div>
        </div>
        <FlowChart inbound={flow.inbound} outbound={flow.outbound} labels={flow.labels} />
      </div>

      <div className="card-flat" style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 16 }}>
          <BankOutlined /> Sử dụng Kho theo Doanh nghiệp / Tenant <span className="chip cyan">Khuyên dùng Multi-tenant</span>
        </div>
        <div className="text-muted" style={{ marginBottom: 12 }}>Phân bổ thể tích chiếm dụng (m³) theo từng Tenant phục vụ tính cước lưu kho chính xác</div>

        {tenants.map((t) => (
          <div key={t.name} style={{ background: '#eff4ff', borderRadius: 8, padding: '8px 12px', marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600 }}>
                <span style={{ color: t.color }}>●</span> {t.name} <span className="chip" style={{ color: '#414755' }}>{t.zone}</span>
              </span>
              <span className="mono" style={{ fontWeight: 700 }}>
                {formatNumber(t.volume)} m³ <span style={{ color: '#0057c2' }}>({t.percent}%)</span>
              </span>
            </div>
            <div className="seg" style={{ margin: '6px 0' }}>
              <span style={{ width: `${t.fill}%`, background: t.color, opacity: 0.9 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }} className="text-muted mono">
              <span>{t.quota}</span>
              <span style={{ color: t.color, fontWeight: 600 }}>Cước tạm tính: {t.fee}</span>
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'space-between', background: '#e5eeff', borderRadius: 8, padding: '10px 12px', marginTop: 12 }}>
          <span><FileTextOutlined /> Tổng cước kho ước tính: <b className="mono">342.5M đ/tháng</b></span>
          <Link to="/customers">Quản lý Hợp đồng & Cước Tenant →</Link>
        </div>
      </div>
    </div>
  )
}
