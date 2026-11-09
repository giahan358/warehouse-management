export default function InfoBanner({ icon, title, badge, children, accent }) {
  return (
    <div className={`banner${accent ? ' accent' : ''}`}>
      {icon && <div style={{ fontSize: 20, color: '#0057c2' }}>{icon}</div>}
      <div style={{ flex: 1 }}>
        <h4>
          {title} {badge && <span className="chip">{badge}</span>}
        </h4>
        <p>{children}</p>
      </div>
    </div>
  )
}
