// Thẻ KPI của màn nhân viên kho. tone: 'primary' | 'danger'
export default function StatCard({ label, value, unit, icon, tone = 'primary', valueColor }) {
  return (
    <div className="stat-card">
      <div>
        <div className="text-muted">{label}</div>
        <div style={{ marginTop: 6 }}>
          <span className="stat-value" style={{ color: valueColor }}>{value}</span>
          {unit && <span className="text-muted" style={{ marginLeft: 6 }}>{unit}</span>}
        </div>
      </div>
      {icon && <div className={`stat-icon ${tone}`}>{icon}</div>}
    </div>
  )
}
