// Khối có tiêu đề nhỏ (eyebrow) dùng trong form popup
export default function PopupSection({ icon, title, extra, children, style }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5eeff', borderRadius: 8, padding: 16, marginBottom: 16, ...style }}>
      {title && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5eeff', paddingBottom: 8, marginBottom: 12 }}>
          <span className="eyebrow" style={{ fontWeight: 600, color: '#0b1c30' }}>
            {icon && <span style={{ color: '#0057c2', marginRight: 6 }}>{icon}</span>}
            {title}
          </span>
          {extra}
        </div>
      )}
      {children}
    </div>
  )
}
